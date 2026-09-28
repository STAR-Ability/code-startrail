#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
int n;cin>>n;set<long long>s;while(n--){long long x;cin>>x;s.insert(x);}if(s.size()<2)cout<<"NONE";else{auto it=s.rbegin();++it;cout<<*it;}
}
