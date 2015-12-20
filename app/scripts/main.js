// Polyfills
import 'classlist-polyfill';
import 'core-js/modules/es6.promise';
import 'core-js/modules/es6.object.assign';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';

document.addEventListener('DOMContentLoaded', () => {
	ReactDOM.render(<App/>, document.getElementById('react'));
});
