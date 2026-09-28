#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;vector<pair<int,int>>a(n);for(auto &p:a)cin>>p.second>>p.first;sort(a.begin(),a.end());int end=-1,ans=0;for(auto [r,l]:a)if(l>=end){ans++;end=r;}cout<<ans;
}
