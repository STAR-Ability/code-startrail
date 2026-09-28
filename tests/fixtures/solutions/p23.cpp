#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n,m;cin>>n>>m;vector<vector<int>>g(n);while(m--){int u,v;cin>>u>>v;--u;--v;g[u].push_back(v);g[v].push_back(u);}vector<int>seen(n);queue<int>q;q.push(0);seen[0]=1;int ans=0;while(!q.empty()){int u=q.front();q.pop();ans++;for(int v:g[u])if(!seen[v]){seen[v]=1;q.push(v);}}cout<<ans;
}
