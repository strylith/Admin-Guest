let authState = { role: 'guest', user: null };

export function setAuthState(next){
  authState = { ...authState, ...next };
}

export function getAuthState(){
  return authState;
}


