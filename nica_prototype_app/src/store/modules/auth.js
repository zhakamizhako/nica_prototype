import objectAssign from 'object-assign';
import {CALL_API} from 'redux-api-middleware-native';

export const SET_LOGIN = 'auth/SET_LOGIN';
export const LOGOUT_SUCCESS = 'auth/LOGOUT_SUCCESS';
export const SET_IP = 'network/SET_IP';
export const PARSE_AUDIO = 'test/PARSE_AUDIO';
export const PARSE_AUDIO_FAIL = 'test/PARSE_AUDIO_FAIL';
export const PARSE_AUDIO_ERROR = 'test/PARSE_AUDIO_ERROR';

export function setIP(data) {
  return async dispatch => {
    await dispatch({
      type: SET_IP,
      meta: {
        done: true,
        value: data,
      },
    });
  };
}

export function setLogin(data) {
  return async dispatch => {
    await dispatch({
      type: SET_LOGIN,
      meta: {
        done: true,
        value: data,
      },
    });
  };
}

export function logout() {
  return async dispatch => {
    await dispatch({
      type: LOGOUT_SUCCESS,
      meta: {
        done: true,
      },
    });
  };
}

export function parseAudio(data) {
  console.log(data);
  return (dispatch, getState) => {
    return dispatch({
      [CALL_API]: {
        endpoint: `http://${this.auth.hostname}:3333/parseaudio`,
        headers: {
          // Accept: 'application/json',
          'Content-Type':
            'multipart/form-data;boundary=someArbitraryUniqueString',
          // 'Content-Type': 'multipart/form',
          // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        body: data,
      },
      types: [
        PARSE_AUDIO,
        {
          type: PARSE_AUDIO_FAIL,
          payload: (action, state, payload) => {
            console.log('wtf!');
            console.log(payload);
            return payload;
          },
        },
        {
          type: PARSE_AUDIO_ERROR,
          payload: (action, state, payload) => {
            console.log('wtf2');
            console.log(payload);
            return payload;
          },
        },
      ],
    });
  };
}

export const actions = {
  setLogin,
  logout,
  parseAudio,
};

const actionHandlers = {};

actionHandlers[LOGOUT_SUCCESS] = () => {
  return initialState;
};

actionHandlers[PARSE_AUDIO] = (state, action) => {
  let newState;
  console.log(action);
  newState = objectAssign({}, state);
  newState.audioData = action.payload.data;
  newState.audioDataError = false;
  return newState;
};

actionHandlers[PARSE_AUDIO] = (state, action) => {
  let newState;
  console.log(action);
  newState = objectAssign({}, state);
  newState.audioDataError = action.payload.message;
  return newState;
};

actionHandlers[SET_IP] = (state, action) => {
  let newState;
  console.log(action);
  newState = objectAssign({}, state);
  newState.hostname = action.meta.value;
  return newState;
};

actionHandlers[SET_LOGIN] = (state, action) => {
  let newState;
  newState = objectAssign({}, state);
  newState.loginData = action.meta;
  return newState;
};

const initialState = {
  loginData: null,
  hostname: 'localhost',
  connectionError: false,
  audioData: null,
  audioDataError: false,
};

export default function reducer(state = initialState, action) {
  const handler = actionHandlers[action.type];

  return handler ? handler(state, action) : state;
}
