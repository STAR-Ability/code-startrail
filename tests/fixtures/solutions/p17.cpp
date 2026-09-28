#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n,m;cin>>n>>m;vector<string>a(n);for(auto &s:a)cin>>s;vector<vector<int>>d(n,vector<int>(m,-1));queue<pair<int,int>>q;if(a[0][0]=='.'){d[0][0]=0;q.push({0,0});}int dx[]={0,1,0,-1},dy[]={1,0,-1,0};while(!q.empty()){auto [x,y]=q.front();q.pop();for(int k=0;k<4;k++){int i=x+dx[k],j=y+dy[k];if(i>=0&&i<n&&j>=0&&j<m&&a[i][j]=='.'&&d[i][j]<0){d[i][j]=d[x][y]+1;q.push({i,j});}}}cout<<d[n-1][m-1];
}
