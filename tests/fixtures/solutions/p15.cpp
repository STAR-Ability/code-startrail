#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(nullptr);
string s;cin>>s;stack<char>st;bool ok=true;for(char c:s){if(c=='('||c=='[')st.push(c);else if(st.empty()||st.top()!=(c==')'?'(':'[')){ok=false;break;}else st.pop();}cout<<(ok&&st.empty()?"YES":"NO");
}
