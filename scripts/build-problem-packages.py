"""维护用原创题包构建器；不在产品运行时生成题目。Python oracle 与 C++ 参考实现交叉验证。"""
import json
from pathlib import Path
from collections import Counter, deque

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ROOT / 'problem-packages'
REFS = ROOT / 'tests/fixtures/solutions'
PACKAGES.mkdir(exist_ok=True)
REFS.mkdir(parents=True, exist_ok=True)
HEADER = '#include <bits/stdc++.h>\nusing namespace std;\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);\n'

def add(n, slug, title, level, tags, statement, inp, out, inputs, oracle, cpp, hints, solution):
    def case(s): return {'input': s.rstrip()+'\n', 'output': str(oracle(s)).rstrip()+'\n'}
    p = dict(id=f'p{n:02}', slug=slug, title=title, difficulty=level, tags=tags,
             description=statement, inputDescription=inp, outputDescription=out,
             samples=[case(s) for s in inputs[:2]], hiddenTests=[case(s) for s in inputs[2:]],
             timeLimitMs=1000, memoryLimitMb=128, estimatedMinutes=[0,10,20,25,30][level],
             objective=hints[0], source='码练星轨 · 原创 Demo 题', version=1,
             hints=hints, solutionOutline=solution)
    assert len(p['hiddenTests']) >= 6
    (PACKAGES/f'{n:02}-{slug}.json').write_text(json.dumps(p, ensure_ascii=False, indent=2)+'\n')
    (REFS/f'p{n:02}.cpp').write_text(HEADER+cpp+'\n}\n')

nums = lambda s: list(map(int, s.split()))
array = lambda a: str(len(a))+'\n'+' '.join(map(str,a))+'\n'
arrays = [[3,1,4,1,5],[-2,-1], [0],[-9,-8,-7],[5,5,5],[0,1,0,-1],[1000000000,-1000000000,9],list(range(200,0,-1))]
add(1,'a-plus-b','两数之和',1,['输入输出'], '计算两个整数 a 和 b 的和。', '一行两个整数，−10^9 ≤ a,b ≤ 10^9。', '输出 a+b。', ['1 2','-3 5','0 0','-1 -2','1000000000 1000000000','-1000000000 -1000000000','7 -7','42 58'], lambda s:sum(nums(s)), 'long long a,b;cin>>a>>b;cout<<a+b;', ['输入里有几个数？输出需要保留什么？','比较加法前后数据的范围。','用整数变量读入两个值，再输出它们的和。'], '依次读入 a、b，输出 a+b。使用 long long 可稳妥处理和的范围。时间和额外空间均为 O(1)。')
add(2,'parity','奇偶信号',1,['条件'], '判断整数 n 是奇数还是偶数。', '一个整数，−10^9 ≤ n ≤ 10^9。', '偶数输出 EVEN，否则输出 ODD。', ['4','7','0','-1','-2','1000000000','999999999','-999999999'], lambda s:'EVEN' if int(s)%2==0 else 'ODD', 'long long n;cin>>n;cout<<(n%2==0?"EVEN":"ODD");', ['偶数能被什么数整除？','负数和零也需要判断。','判断 n%2 是否等于 0。'], '余数为 0 时是偶数，其余为奇数。不要用 n%2==1 判断所有奇数，因为 C++ 负奇数的余数可能为 −1。O(1)。')
add(3,'max-three','三个数的最大值',1,['条件'], '从三个整数中找出最大值。', '三个整数，每个绝对值不超过 10^9。', '输出最大值。', ['1 3 2','-1 -4 -2','0 0 0','5 5 1','-1000000000 -9 -8','9 8 7','7 8 9','1000000000 1 -1'], lambda s:max(nums(s)), 'long long a,b,c;cin>>a>>b>>c;cout<<max({a,b,c});', ['三个数都小于零时会发生什么？','先把其中一个数看作当前最大值。','将后两个数依次与当前最大值比较。'], '从第一个输入初始化最大值，依次比较剩余值。不能从 0 初始化负数集合的最大值。O(1)。')
add(4,'sum-to-n','从一加到 n',1,['循环'], '求 1+2+…+n；n 为 0 时和为 0。', '一个整数，0 ≤ n ≤ 10^6。', '输出总和。', ['3','5','0','1','2','999','1000000','100000'], lambda s:int(s)*(int(s)+1)//2, 'long long n;cin>>n;cout<<n*(n+1)/2;', ['累加过程中要保留什么？','总和可能超出 32 位整数范围。','可用 long long 循环累加，也可配对求和。'], '使用 long long 累加 1 到 n，为 O(n)；等差数列公式 n(n+1)/2 为 O(1)。注意乘法也必须以 64 位进行。')
add(5,'digit-sum','数位之和',1,['循环'], '计算一个非负整数的各位数字之和。', '整数 n，0 ≤ n ≤ 10^18。', '输出数位和。', ['123','90','0','1','999999999999999999','1000000000000000000','10101','808080'], lambda s:sum(map(int,s)), 'unsigned long long n;cin>>n;int ans=0;while(n){ans+=n%10;n/=10;}cout<<ans;', ['如何取出最右侧的一位？','除以 10 后，剩余的数发生了什么变化？','重复取余和整除，累加每次取出的数字。'], '循环执行 ans+=n%10、n/=10，直到 n 为 0。初始 n=0 时答案也是 0。O(位数)。')
add(6,'array-max','数组峰值',2,['数组'], '找出数组中的最大元素。', '第一行 n（1≤n≤10^5），第二行 n 个整数，绝对值≤10^9。', '输出最大值。', list(map(array,arrays)), lambda s:max(nums(s)[1:]), 'int n;cin>>n;long long x,ans=LLONG_MIN;while(n--){cin>>x;ans=max(ans,x);}cout<<ans;', ['一次遍历需要记住多少信息？','考虑数组中所有元素都是负数。','从首元素或最小整数初始化答案，逐个更新。'], '维护已读元素的最大值，读入每个数时更新。O(n) 时间、O(1) 额外空间。')
second_inputs=[[2,4,3],[5,5],[1],[-5,-2,-3],[9,9,8,8],[0,-1],[1000000000,-1000000000],list(range(100))]
def second(s):
    a=sorted(set(nums(s)[1:]));return a[-2] if len(a)>=2 else 'NONE'
add(7,'second-largest','第二个不同的最大值',2,['数组'], '求数组中第二大的不同数值。如果没有两个不同数值，输出 NONE。', 'n（1≤n≤10^5），随后 n 个整数，绝对值≤10^9。', '第二大不同数值，或 NONE。', list(map(array,second_inputs)), second, 'int n;cin>>n;set<long long>s;while(n--){long long x;cin>>x;s.insert(x);}if(s.size()<2)cout<<"NONE";else{auto it=s.rbegin();++it;cout<<*it;}', ['重复的最大值应算作几个不同数值？','分别考虑只出现一种值和至少两种值。','可去重后排序；或维护最大、次大两个不同值。'], '用有序集合去重后取倒数第二个，若不足两种值输出 NONE，O(n log n)。也可用两个状态实现 O(n)。')
add(8,'distinct-count','不同元素有多少',2,['数组','哈希'], '统计数组里不同数值的数量。', 'n（1≤n≤10^5），随后 n 个绝对值≤10^9 的整数。', '输出不同数值的个数。', list(map(array,arrays)), lambda s:len(set(nums(s)[1:])), 'int n;cin>>n;set<long long>s;while(n--){long long x;cin>>x;s.insert(x);}cout<<s.size();', ['同一个值多次出现要计数几次？','需要一种能判断“已经见过”的结构。','把元素加入集合，最终读取集合大小。'], '集合自动去重，输出大小。std::set 为 O(n log n)，unordered_set 为平均 O(n)。')
add(9,'letter-count','字母计数',2,['字符串'], '统计字符串中指定小写字母的出现次数。', '第一行非空小写字符串 s（长度≤10^5），第二行一个小写字母 c。', '输出 c 的出现次数。', ['banana\na','hello\nl','a\na','abc\nz','aaaaaa\na','zzzz\nz','abcdef\na','a'*10000+'\nb'], lambda s:s.split()[0].count(s.split()[1]), 'string s;char c;cin>>s>>c;cout<<count(s.begin(),s.end(),c);', ['如何逐个访问字符串中的字符？','只在当前字符等于目标时增加计数。','从 0 开始，扫描全部字符并比较。'], '一次遍历，遇到目标字母则计数加一。O(|s|) 时间，O(1) 额外空间。')
add(10,'sort-array','整理数字',2,['排序','数组'], '将数组按非降序输出。', 'n（1≤n≤10^5），随后 n 个整数，绝对值≤10^9。', '排序后的 n 个整数，空格分隔。', list(map(array,arrays)), lambda s:' '.join(map(str,sorted(nums(s)[1:]))), 'int n;cin>>n;vector<long long>a(n);for(auto &x:a)cin>>x;sort(a.begin(),a.end());for(auto x:a)cout<<x<<" ";', ['非降序允许相等的元素吗？','负数和重复值也必须保留。','读入 vector 后调用 sort，再依次输出。'], 'std::sort 按升序排列全部元素，不去重。O(n log n) 时间。')
prefix_inputs=['5 2\n1 2 3 4 5\n1 3\n2 5','3 1\n-1 0 2\n1 3','1 1\n0\n1 1','2 2\n1000000000 1000000000\n1 2\n2 2','4 2\n-3 -2 -1 -4\n1 4\n2 3','3 3\n2 2 2\n1 1\n2 2\n3 3','5 2\n0 0 0 0 0\n1 5\n3 4','6 3\n1 -1 1 -1 1 -1\n1 6\n2 5\n3 3']
def prefix(s):
    a=nums(s);n,q=a[:2];v=a[2:2+n];qs=a[2+n:];return '\n'.join(str(sum(v[qs[2*i]-1:qs[2*i+1]])) for i in range(q))
add(11,'range-sum','区间求和',2,['数组','前缀和'], '多次询问数组区间 [l,r] 的元素和，下标从 1 开始。', 'n,q（1≤n,q≤10^5）；n 个绝对值≤10^9 的整数；随后 q 行 l,r（1≤l≤r≤n）。', '每行输出一个区间和。', prefix_inputs, prefix, 'int n,q;cin>>n>>q;vector<long long>s(n+1);for(int i=1;i<=n;i++){cin>>s[i];s[i]+=s[i-1];}while(q--){int l,r;cin>>l>>r;cout<<s[r]-s[l-1]<<"\\n";}', ['相邻两次查询可能重复计算哪些值？','预先保存从开头到每个位置的和。','区间 [l,r] 的和可由两个前缀和相减。'], '定义 s[0]=0，s[i]=s[i-1]+a[i]。查询为 s[r]-s[l-1]。总时间 O(n+q)，用 long long。')
add(12,'palindrome','回文检查',2,['字符串'], '判断小写字符串从左到右和从右到左是否相同。', '非空小写字符串，长度≤10^5。', '是回文输出 YES，否则 NO。', ['abba','abc','a','aa','ab','abcba','abca','a'*999+'b'], lambda s:'YES' if s==s[::-1] else 'NO', 'string s;cin>>s;string t=s;reverse(t.begin(),t.end());cout<<(s==t?"YES":"NO");', ['回文的首尾字符有什么关系？','比较一对后，可以怎样缩小剩余范围？','左右指针向中间移动，或与反转后的串比较。'], '从两端向中间逐对比较，任一不等就不是回文。O(n) 时间；双指针 O(1) 额外空间。')
bin_inputs=['5 3\n1 2 3 3 5','3 4\n1 2 3','1 0\n0','1 1\n0','4 2\n2 2 2 2','4 -5\n-5 -5 -2 0','5 9\n1 3 5 7 9','5 4\n1 3 5 7 9']
def firstpos(s):
    a=nums(s);return a[2:].index(a[1])+1 if a[1] in a[2:] else -1
add(13,'first-position','第一次出现的位置',3,['二分','数组'], '在非降序数组中找出 x 第一次出现的位置（从 1 开始），不存在则输出 −1。', 'n,x（1≤n≤10^5，|x|≤10^9）；n 个非降序整数，绝对值≤10^9。', '输出位置或 −1。', bin_inputs, firstpos, 'int n;long long x;cin>>n>>x;vector<long long>a(n);for(auto &v:a)cin>>v;auto it=lower_bound(a.begin(),a.end(),x);cout<<(it!=a.end()&&*it==x?it-a.begin()+1:-1);', ['重复值出现时，需要哪一个位置？','寻找第一个不小于 x 的值。','缩小左右区间后，仍需检查候选值确实等于 x。'], '使用 lower_bound 得到第一个≥x的位置；若越界或值不等输出−1，否则输出下标+1。查询 O(log n)，读取 O(n)。')
freq_inputs=[[1,2,2,3],[5],[1,1,1,1],[0,0,-1,-1],[9,8,7,6],[1,2,1,2,1],[-1000000000,-1000000000],list(range(100))]
add(14,'equal-pairs','相等数对',3,['哈希','数组'], '统计满足 i<j 且 a[i]=a[j] 的下标对数量。', 'n（1≤n≤10^5），随后 n 个整数，绝对值≤10^9。', '输出数对数量。', list(map(array,freq_inputs)), lambda s:sum(c*(c-1)//2 for c in Counter(nums(s)[1:]).values()), 'int n;cin>>n;map<long long,long long>cnt;long long ans=0,x;while(n--){cin>>x;ans+=cnt[x];cnt[x]++;}cout<<ans;', ['某个数出现三次，可以组成几对？','新读入一个值，能与之前多少个相同值配对？','先将已有频次加入答案，再将当前频次加一。'], '维护频次数组或 map，每读一个值 x，ans+=cnt[x] 后 cnt[x]++。也可汇总 c(c-1)/2；答案用 long long。')
def brackets(s):
    st=[]
    for c in s:
        if c in '([':st.append(c)
        elif not st or st.pop()!=('(' if c==')' else '['):return 'NO'
    return 'YES' if not st else 'NO'
add(15,'brackets','括号配对',3,['栈','字符串'], '判断仅包含 ()[] 的非空字符串是否正确配对、嵌套。', '一个长度≤10^5 的括号字符串。', '合法输出 YES，否则 NO。', ['([])','([)]','(',')','[]','()[]()','[([])]','(()'], brackets, 'string s;cin>>s;stack<char>st;bool ok=true;for(char c:s){if(c==\'("[0]||c==\'[\')st.push(c);else if(st.empty()||st.top()!=(c==\')\'?\'(\':\'[\')){ok=false;break;}else st.pop();}cout<<(ok&&st.empty()?"YES":"NO");'.replace("c=='(\"[0]", "c=='('"), ['右括号应该匹配最早还是最近的未匹配左括号？','空栈遇到右括号时如何处理？','遇左括号入栈；遇右括号检查栈顶并弹出，结束检查栈为空。'], '用栈维护未配对左括号，匹配失败立即 NO；末尾栈必须为空。O(n) 时间、O(n) 空间。')
queue_inputs=['5\nPUSH 3\nPUSH 4\nPOP\nPOP\nPOP','2\nPOP\nPUSH 1','1\nPOP','3\nPUSH -1\nPOP\nPOP','4\nPUSH 0\nPUSH 0\nPOP\nPOP','2\nPUSH 9\nPUSH 8','6\nPUSH 1\nPOP\nPUSH 2\nPOP\nPUSH 3\nPOP','3\nPOP\nPOP\nPOP']
def queue(s):
    q=deque();out=[]
    for l in s.splitlines()[1:]:
        if l.startswith('PUSH'):q.append(l.split()[1])
        else:out.append(q.popleft() if q else 'EMPTY')
    return '\n'.join(out)
add(16,'queue','排队服务',3,['队列'], '处理 PUSH x 和 POP。POP 输出并移除队首；空队列输出 EMPTY。', '操作数 q（1≤q≤10^5），随后 q 行操作，|x|≤10^9。', '每次 POP 输出一行；没有 POP 时输出为空。', queue_inputs, queue, 'int n;cin>>n;queue<long long>q;while(n--){string s;cin>>s;if(s=="PUSH"){long long x;cin>>x;q.push(x);}else if(q.empty())cout<<"EMPTY\\n";else{cout<<q.front()<<"\\n";q.pop();}}', ['先到的人应该在什么时候被取出？','只需维护队首与队尾，无需每次移动所有元素。','使用 queue 的 push、front、pop，并先判断 empty。'], '按操作模拟 FIFO 队列，POP 时先判空。每个操作 O(1)，总时间 O(q)。')
grids=['3 3\n...\n.#.\n...','2 2\n.#\n#.','1 1\n.','1 1\n#','1 5\n.....','3 2\n..\n##\n..','4 4\n....\n###.\n....\n.###','40 40\n'+'\n'.join(['.'*40]*40)]
def shortest(s):
    lines=s.splitlines();n,m=map(int,lines[0].split());a=lines[1:]
    if a[0][0]=='#' or a[-1][-1]=='#':return -1
    q=deque([(0,0,0)]);seen={(0,0)}
    while q:
        x,y,d=q.popleft()
        if (x,y)==(n-1,m-1):return d
        for dx,dy in [(0,1),(1,0),(-1,0),(0,-1)]:
            i,j=x+dx,y+dy
            if 0<=i<n and 0<=j<m and a[i][j]=='.' and (i,j) not in seen:seen.add((i,j));q.append((i,j,d+1))
    return -1
add(17,'grid-path','网格最短路',3,['搜索','BFS'], '从左上角到右下角，每步上下左右移动一格，只能经过 .；# 为障碍。求最少步数。起点或终点是障碍时也不可达。', 'n,m（1≤n,m≤50），随后 n 行各 m 个 . 或 #。', '最短步数；不可达输出 −1。', grids, shortest, 'int n,m;cin>>n>>m;vector<string>a(n);for(auto &s:a)cin>>s;vector<vector<int>>d(n,vector<int>(m,-1));queue<pair<int,int>>q;if(a[0][0]==\'.\'){d[0][0]=0;q.push({0,0});}int dx[]={0,1,0,-1},dy[]={1,0,-1,0};while(!q.empty()){auto [x,y]=q.front();q.pop();for(int k=0;k<4;k++){int i=x+dx[k],j=y+dy[k];if(i>=0&&i<n&&j>=0&&j<m&&a[i][j]==\'.\'&&d[i][j]<0){d[i][j]=d[x][y]+1;q.push({i,j});}}}cout<<d[n-1][m-1];', ['每一步代价都相同时，应该先探索哪些格子？','按距离一层一层展开，首次到达的位置距离已确定。','队列保存待探索格子，入队时标记访问并记录距离。'], 'BFS 从起点按层扩展，入队立即标记，防止重复入队。O(nm) 时间与空间。')
def components(s):
    a=s.splitlines();n,m=map(int,a[0].split());g=a[1:];seen=set();ans=0
    for x in range(n):
        for y in range(m):
            if g[x][y]!='.' or (x,y) in seen:continue
            ans+=1;st=[(x,y)];seen.add((x,y))
            while st:
                i,j=st.pop()
                for u,v in [(i+1,j),(i-1,j),(i,j+1),(i,j-1)]:
                    if 0<=u<n and 0<=v<m and g[u][v]=='.' and (u,v) not in seen:seen.add((u,v));st.append((u,v))
    return ans
add(18,'grid-components','连通的空地',3,['搜索','DFS'], '统计 . 构成的连通块数量，上下左右相邻算连通，# 不属于空地。', 'n,m（1≤n,m≤50），随后 n 行网格。', '输出空地连通块数量。', grids, components, 'int n,m;cin>>n>>m;vector<string>a(n);for(auto &s:a)cin>>s;int ans=0;function<void(int,int)>dfs=[&](int x,int y){if(x<0||x>=n||y<0||y>=m||a[x][y]!=\'.\')return;a[x][y]=\'#\';dfs(x+1,y);dfs(x-1,y);dfs(x,y+1);dfs(x,y-1);};for(int i=0;i<n;i++)for(int j=0;j<m;j++)if(a[i][j]==\'.\'){ans++;dfs(i,j);}cout<<ans;', ['同一块空地是否应该多次计数？','发现新空地后，先标记所有能从它到达的位置。','遍历网格，未访问的空地启动一次 DFS，答案加一。'], '外层遍历每个格子，DFS/BFS 标记整个连通块，每次新搜索计一块。O(nm)，注意边界和访问标记。')
intervals=[[(1,3),(2,4),(3,5)],[(0,1)],[(1,2),(1,2)],[(0,10),(1,2),(2,3)],[(1,5),(2,4),(3,6)],[(0,1),(1,2),(2,3)],[(5,8),(0,2),(2,5)],[(0,100),(1,3),(4,6),(7,9),(10,12)]]
interval_input=lambda a:str(len(a))+'\n'+'\n'.join(f'{l} {r}' for l,r in a)
def meetings(s):
    a=nums(s)[1:];iv=list(zip(a[::2],a[1::2]));best=0
    for mask in range(1<<len(iv)):
        chosen=sorted(iv[i] for i in range(len(iv)) if mask>>i&1)
        if all(chosen[i][1]<=chosen[i+1][0] for i in range(len(chosen)-1)):best=max(best,len(chosen))
    return best
add(19,'meetings','安排更多活动',4,['贪心','区间'], '选择尽可能多的活动，时间段 [l,r) 不重叠。前一个活动结束时可立即开始下一个。', 'n（1≤n≤10^5）；随后 n 行 l,r（0≤l<r≤10^9）。', '最多活动数量。', list(map(interval_input,intervals)), meetings, 'int n;cin>>n;vector<pair<int,int>>a(n);for(auto &p:a)cin>>p.second>>p.first;sort(a.begin(),a.end());int end=-1,ans=0;for(auto [r,l]:a)if(l>=end){ans++;end=r;}cout<<ans;', ['选很长的活动可能牺牲哪些后续机会？','结束得更早，会不会留下更多剩余时间？','按结束时刻排序，能接上的活动就选取。'], '按右端点升序贪心。每次选最早结束且不冲突的活动，交换论证可证明不会减少后续选择。O(n log n)。')
add(20,'coins','兑换硬币',4,['贪心'], '用面额 1、5、10 的硬币凑出 n，每种无限。求最少硬币数。', '整数 n，0≤n≤10^9。', '最少硬币数。', ['16','9','0','1','5','10','99','1000000000'], lambda s:int(s)//10+int(s)%10//5+int(s)%5, 'long long n;cin>>n;cout<<n/10+n%10/5+n%5;', ['在这组面额里，几个小硬币能被一个大硬币替代？','1 和 5 的使用数量各自有什么上限？','先取 10，再取 5，剩余用 1；说明为何不会错。'], '10 可替换两个 5，5 可替换五个 1；最优解中 5 最多一个、1 最多四个。依次整除取余，O(1)。此结论不能推广到任意面额。')
def stairs(s):
    a,b=1,1
    for _ in range(int(s)):a,b=b,(a+b)%1000000007
    return a
add(21,'stairs','登上台阶',4,['动态规划'], '共有 n 级台阶，每次走 1 或 2 级，求到达顶部的方法数。n=0 时有一种方法（不走）。', '整数 n，0≤n≤10^5。', '方法数对 1000000007 取模。', ['3','4','0','1','2','10','100','100000'], stairs, 'int n;cin>>n;long long a=1,b=1;for(int i=0;i<n;i++){long long c=(a+b)%1000000007;a=b;b=c;}cout<<a;', ['最后一步可能从哪里来？','用 f[i] 表示到第 i 级的方法数，明确 f[0]。','f[i]=f[i-1]+f[i-2]，每步取模；可只保留两个状态。'], '从最后一步分类得到递推，初始 f[0]=f[1]=1。滚动变量 O(n) 时间、O(1) 空间。')
def maxsub(s):
    a=nums(s)[1:];return max(sum(a[i:j]) for i in range(len(a)) for j in range(i+1,len(a)+1))
add(22,'max-subarray','最大连续和',4,['动态规划','数组'], '选择一段非空连续子数组，使其元素和最大。', 'n（1≤n≤10^5），随后 n 个整数，绝对值≤10^9。', '最大连续和。', list(map(array,[[-2,1,-3,4,-1,2,1,-5,4],[1,2],[0],[-9,-2,-7],[1000000000,1000000000],[5,-10,6],[1,-1,1,-1],[-1]])), maxsub, 'int n;cin>>n;long long best=LLONG_MIN,cur=0,x;while(n--){cin>>x;cur=max(x,cur+x);best=max(best,cur);}cout<<best;', ['以当前位置结尾的最优段，能从上一位置的哪种状态转移？','之前的连续和为负时，还值得保留吗？','维护以当前元素结尾的最大和，以及全局最大和。'], 'cur=max(a[i],cur+a[i])，best=max(best,cur)。非空条件意味着不能把答案初始为 0；全负数组应返回最大元素。O(n)，long long。')
graph_inputs=['4 3\n1 2\n2 3\n3 4','4 1\n2 3','1 0','3 0','3 3\n1 2\n2 3\n3 1','5 3\n1 2\n2 3\n4 5','4 3\n1 2\n1 3\n1 4','5 4\n2 3\n3 4\n4 5\n5 2']
def reach(s):
    a=nums(s);n,m=a[:2];g=[[] for _ in range(n)];seen={0};q=[0]
    for i in range(m):u,v=a[2+2*i]-1,a[3+2*i]-1;g[u].append(v);g[v].append(u)
    for u in q:
        for v in g[u]:
            if v not in seen:seen.add(v);q.append(v)
    return len(seen)
add(23,'reachable','可以到达的节点',4,['图','搜索'], '无向图有 n 个节点编号 1…n，统计从节点 1 能到达多少节点，包含节点 1 自己。', 'n,m（1≤n≤10^5，0≤m≤2×10^5）；随后 m 行 u,v 表示无向边。', '可达节点数量。', graph_inputs, reach, 'int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}vector<int>seen(n);queue<int>q;q.push(0);seen[0]=1;int ans=0;while(!q.empty()){int u=q.front();q.pop();ans++;for(int v:g[u])if(!seen[v]){seen[v]=1;q.push(v);}}cout<<ans;', ['图中存在环时，怎样防止重复访问？','无向边要在两个方向保存。','从节点 1 开始搜索，每个节点首次访问时计数。'], '建邻接表后 BFS/迭代 DFS，并记录 visited，O(n+m)。节点1没有边时答案仍为1。')
def merge(s):
    a=nums(s)[1:];iv=sorted(zip(a[::2],a[1::2]));out=[]
    for l,r in iv:
        if out and l<=out[-1][1]:out[-1][1]=max(out[-1][1],r)
        else:out.append([l,r])
    return len(out)
add(24,'merge-intervals','合并重叠区间',4,['排序','区间'], '合并有交集的闭区间 [l,r]；端点相同也算有交集。求合并后区间数量。', 'n（1≤n≤10^5）；随后 n 行 l,r（0≤l≤r≤10^9）。', '合并后的区间数量。', list(map(interval_input,intervals)), merge, 'int n;cin>>n;vector<pair<int,int>>a(n);for(auto &p:a)cin>>p.first>>p.second;sort(a.begin(),a.end());int end=-1,ans=0;for(auto [l,r]:a){if(l>end){ans++;end=r;}else end=max(end,r);}cout<<ans;', ['顺序打乱时，如何知道当前区间是否应该合并？','按左端点排序后，只需比较当前组的最右端点。','左端点≤当前右端点时扩展，否则开始一个新区间。'], '排序后扫描，维护当前合并区间最右端点，不能在被包含的区间上缩短它。闭区间端点接触需要合并。O(n log n)。')
print('Built 24 versioned problem packages and independent C++ reference solutions.')
