/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

// var React = require('react-native');

// To see all the requests in the chrome Dev tools in the network tab.
GLOBAL.XMLHttpRequest = GLOBAL.originalXMLHttpRequest || GLOBAL.XMLHttpRequest;
GLOBAL.FormData = GLOBAL.originalFormData || GLOBAL.FormData;
// fetch logger
global._fetch = fetch;
global.fetch = function(uri, options, ...args) {
  return global._fetch(uri, options, ...args).then(response => {
    console.log('Fetch', {request: {uri, options, ...args}, response});
    return response;
  });
};

import {Provider} from 'react-redux';
import React, {Component} from 'react';
import configureStore from './configureStore';
import {PersistGate} from 'redux-persist/integration/react';
import {Provider as AntProvider} from '@ant-design/react-native';
import enUS from '@ant-design/react-native/lib/locale-provider/en_US';
import App from './App';

export default class boot extends Component {
  constructor(props) {
    super(props);
    const {persistor, store} = configureStore();
    this.persistor = persistor;
    this.store = store;
  }

  render() {
    return (
      <Provider store={this.store}>
        <PersistGate loading={null} persistor={this.persistor}>
          <AntProvider locale={enUS}>
            <App {...this.props} />
          </AntProvider>
        </PersistGate>
      </Provider>
    );
  }
}
