import React from 'react';
import { autobind } from 'core-decorators';
import classNames from 'classnames';

import Storage from '../utils/Storage';
import { deparam } from '../utils/Object';

import Home from './Home';
import Player from './Player';
import Header from './elements/Header';
import Footer from './elements/Footer';
import Loader from './elements/Loader';

class Hadio extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			ready: true,
			apiUrl: undefined
		};
	}

	static childContextTypes = {
		app: React.PropTypes.object
	};

	getChildContext() {
		return {
			app: {
				log: this.log,
				setApiUrl: this.setApiUrl,
				setStationData: this.setStationData
			}
		};
	}

	componentWillMount() {
		const data = Storage.getItem('hadio');

		if (data.apiUrl) {
			this.setState({
				apiUrl: data.apiUrl
			});
		}
		else {
			const queryData = deparam(location.search.substr(1));

			if (queryData.apiUrl) {
				this.setState({
					apiUrl: queryData.apiUrl
				});
			}
		}
	}

	@autobind
	log() {
		if (this.debug) {
			console.log(...arguments); // eslint-disable-line no-console
		}
	}

	@autobind
	setStationData(data) {
		this.setState(data);
	}

	@autobind
	setApiUrl(apiUrl) {
		if (apiUrl === undefined) {
			return false;
		}

		this.setState({
			apiUrl
		});

		Storage.setItem('hadio', {
			apiUrl
		});
	}

	render() {
		const state = this.state;

		let html;
		let header;

		if (state.ready) {
			header = (
				<Header name={state.name} logo={state.logo} description={state.description} />
			);
// if this than that localStorage
			if (state.apiUrl) {
				html = (
					<Player apiUrl={state.apiUrl} />
				);
			}
			else {
				html = (
					<Home />
				);
			}
		}
		else {
			html = (<Loader />);
		}

		return (
			<div key="Hadio" className={classNames('app', { app__loading: !state.ready })}>
				{header}

				<main className="app__content">
					{html}
				</main>
				<Footer apiUrl={state.apiUrl} />
			</div>
		);
	}
}

export default Hadio;
