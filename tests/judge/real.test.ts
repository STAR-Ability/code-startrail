import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GoJudgeClient } from "../../src/server/judge";
import { readPackages } from "../../src/server/db/seed";
const judge = new GoJudgeClient();
const packages = readPackages();
const p = packages[0];
test(
  "all 24 reference solutions pass public and hidden cases in the real sandbox",
  { timeout: 240000 },
  async () => {
    for (const problem of packages) {
      const code = readFileSync(
        `tests/fixtures/solutions/${problem.id}.cpp`,
        "utf8",
      );
      const result = await judge.judge(
        code,
        problem,
        [...problem.samples, ...problem.hiddenTests],
        "submit",
      );
      assert.equal(
        result.verdict,
        "AC",
        `${problem.id}: ${JSON.stringify(result)}`,
      );
      assert.equal(result.passed, 8);
      console.log(`${problem.id} ${problem.title}: 8/8 AC`);
    }
  },
);
test(
  "real WA, CE, TLE, RE, OLE and MLE; hidden stdout/stderr never returned",
  { timeout: 90000 },
  async () => {
    const cases = [
      ["WA", '#include <iostream>\nint main(){std::cout<<"incorrect";}'],
      ["CE", "int main( {"],
      ["TLE", "int main(){while(true){}}"],
      ["RE", "#include <cstdlib>\nint main(){abort();}"],
      [
        "OLE",
        '#include <cstdio>\nint main(){while(true)puts("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");}',
      ],
      [
        "MLE",
        "#include <vector>\n#include <cstring>\nint main(){std::vector<char*> v;while(true){char*p=new char[1024*1024];memset(p,1,1024*1024);v.push_back(p);}}",
      ],
    ];
    for (const [expected, code] of cases) {
      const result = await judge.judge(code, p, [p.hiddenTests[0]], "submit");
      assert.equal(result.verdict, expected, JSON.stringify(result));
    }
    const echo = await judge.judge(
      "#include <iostream>\n#include <string>\nint main(){std::string s;while(std::getline(std::cin,s)){std::cout<<s;std::cerr<<s;}}",
      p,
      [{ input: "HIDDEN_CANARY_73945", output: "no" }],
      "submit",
    );
    assert.equal(echo.verdict, "WA");
    assert.ok(!JSON.stringify(echo).includes("HIDDEN_CANARY_73945"));
    const sample = await judge.judge(
      readFileSync("tests/fixtures/solutions/p01.cpp", "utf8"),
      p,
      p.samples,
      "sample",
    );
    assert.equal(sample.verdict, "AC");
    assert.equal(sample.samples?.[0].actual.trim(), "3");
  },
);
test(
  "sandbox runs non-root, isolates filesystem/network, limits children, cleans files",
  { timeout: 30000 },
  async () => {
    const code = `#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <cstdio>
int main(){
 if(geteuid()==0)return 1;
 if(access("/app/storage/codestartrail.sqlite",F_OK)==0)return 2;
 if(open("/usr/should-not-write",O_CREAT|O_WRONLY,0600)>=0)return 3;
 int fd=socket(AF_INET,SOCK_STREAM,0);sockaddr_in a{};a.sin_family=AF_INET;a.sin_port=htons(80);inet_pton(AF_INET,"1.1.1.1",&a.sin_addr);
 if(connect(fd,(sockaddr*)&a,sizeof(a))==0)return 4;
 int count=0; for(int i=0;i<20;i++){pid_t pid=fork();if(pid==0){usleep(250000);_exit(0);}if(pid<0)break;count++;}
 while(wait(nullptr)>0){} if(count>=20)return 5;puts("isolated");
}`;
    const result = await judge.judge(
      code,
      p,
      [{ input: "", output: "isolated" }],
      "sample",
    );
    assert.equal(result.verdict, "AC", JSON.stringify(result));
    const [status] = await (
      await judge.request("/run", {
        cmd: [
          {
            args: ["/bin/cat", "/proc/self/status"],
            files: [
              { content: "" },
              { name: "stdout", max: 8192 },
              { name: "stderr", max: 1024 },
            ],
            cpuLimit: 1e9,
            clockLimit: 3e9,
            memoryLimit: 128 * 1024 ** 2,
            procLimit: 8,
          },
        ],
      })
    ).json();
    assert.equal(status.status, "Accepted");
    assert.match(status.files.stdout, /Uid:\s+1000\s+1000\s+1000\s+1000/);
    assert.match(status.files.stdout, /CapEff:\s+0+\n/);
    assert.match(status.files.stdout, /NoNewPrivs:\s+1/);
    assert.match(status.files.stdout, /Seccomp:\s+2/);
    const response = await judge.request("/file");
    const files = await response.json();
    assert.equal(
      Object.keys(files).length,
      0,
      "compiled file cache should be empty",
    );
    const config = await (await judge.request("/config")).json();
    assert.ok([1, 2].includes(config.runnerConfig.cgroupType));
    for (const controller of ["cpu", "memory", "pids"])
      assert.ok(config.runnerConfig.cgroupControllers.includes(controller));
    console.log(
      "Sandbox: UID 1000, no capabilities, seccomp, isolated network/filesystem, bounded children, clean file cache",
    );
  },
);
