#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;map<long long,long long>cnt;long long ans=0,x;while(n--){cin>>x;ans+=cnt[x];cnt[x]++;}cout<<ans;
}
