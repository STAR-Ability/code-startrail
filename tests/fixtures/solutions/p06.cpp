#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;long long x,ans=LLONG_MIN;while(n--){cin>>x;ans=max(ans,x);}cout<<ans;
}
