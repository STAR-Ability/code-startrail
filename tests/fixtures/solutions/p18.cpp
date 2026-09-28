#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n,m;cin>>n>>m;vector<string>a(n);for(auto &s:a)cin>>s;int ans=0;function<void(int,int)>dfs=[&](int x,int y){if(x<0||x>=n||y<0||y>=m||a[x][y]!='.')return;a[x][y]='#';dfs(x+1,y);dfs(x-1,y);dfs(x,y+1);dfs(x,y-1);};for(int i=0;i<n;i++)for(int j=0;j<m;j++)if(a[i][j]=='.'){ans++;dfs(i,j);}cout<<ans;
}
