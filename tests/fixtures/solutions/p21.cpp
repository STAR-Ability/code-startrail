#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;long long a=1,b=1;for(int i=0;i<n;i++){long long c=(a+b)%1000000007;a=b;b=c;}cout<<a;
}
