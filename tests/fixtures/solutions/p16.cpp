#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;queue<long long>q;while(n--){string s;cin>>s;if(s=="PUSH"){long long x;cin>>x;q.push(x);}else if(q.empty())cout<<"EMPTY\n";else{cout<<q.front()<<"\n";q.pop();}}
}
