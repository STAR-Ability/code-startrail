#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;vector<pair<int,int>>a(n);for(auto &p:a)cin>>p.first>>p.second;sort(a.begin(),a.end());int end=-1,ans=0;for(auto [l,r]:a){if(l>end){ans++;end=r;}else end=max(end,r);}cout<<ans;
}
