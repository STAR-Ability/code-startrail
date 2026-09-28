#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;long long best=LLONG_MIN,cur=0,x;while(n--){cin>>x;cur=max(x,cur+x);best=max(best,cur);}cout<<best;
}
