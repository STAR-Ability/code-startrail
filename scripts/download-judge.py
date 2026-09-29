"""Download a pinned official binary for an offline image build, with checksum verification."""
import hashlib
import pathlib
import platform
import sys
import urllib.request

arch = sys.argv[1] if len(sys.argv) > 1 else {'x86_64': 'amd64', 'arm64': 'arm64', 'aarch64': 'arm64'}[platform.machine()]
checksums = {'amd64': '700d0ba6a6c02cce777e8761a5851b3d8d3e198e120887cda8e9134eb62efbce', 'arm64': 'ce76a5d295e8fc65d0f621c465839e5f56016b402c593a7b2942eaa6f6da435a'}
expected = checksums[arch]
target = pathlib.Path(__file__).resolve().parents[1] / 'judge/.cache/go-judge'
target.parent.mkdir(exist_ok=True)
if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
    print('Already verified:', target)
    sys.exit(0)
url = f'https://github.com/criyle/go-judge/releases/download/v1.13.0/go-judge_1.13.0_linux_{arch}'
with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'codeStartrail'}), timeout=120) as response:
    content = response.read()
if hashlib.sha256(content).hexdigest() != expected:
    raise SystemExit('Checksum mismatch; refusing to use binary')
target.write_bytes(content)
print('Verified go-judge v1.13.0:', arch, len(content), 'bytes')
