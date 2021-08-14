// configureStore.js

import {createStore, applyMiddleware} from 'redux';
import {persistStore, persistReducer} from 'redux-persist';
import thunkMiddleware from 'redux-thunk';
import {apiMiddleware} from 'redux-api-middleware-native';
import AsyncStorage from '@react-native-community/async-storage';
import {name as appName} from './app.json';
import {composeWithDevTools} from 'redux-devtools-extension';
// import storage from 'redux-persist/lib/storage' // defaults to localStorage for web

import rootReducer from './src/store/reducers';

const persistConfig = {
  key: 'root',
  blacklist: [],
  whitelist: ['auth'],
  keyPrefix: appName,
  storage: AsyncStorage,
  timeout: null,
};
const middlewares = [thunkMiddleware, apiMiddleware];

const persistedReducer = persistReducer(persistConfig, rootReducer);

export default () => {
  let store = createStore(
    persistedReducer,
    composeWithDevTools(applyMiddleware(...middlewares)),
  );
  let persistor = persistStore(store);

  return {store, persistor};
};
