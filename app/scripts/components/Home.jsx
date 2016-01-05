import React from 'react';
import { autobind } from 'core-decorators';
import URL from 'url-parser';

class Home extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			error: undefined
		};
	}

	static contextTypes = {
		app: React.PropTypes.object
	};

	@autobind
	onSubmitForm(e) {
		e.preventDefault();

		const formData = e.target;
		let urlObject;

		if (!formData.elements.apiUrl.value) {
			this.setState({
				error: 'URL Missing. Please try again!'
			});
		}
		else {
			urlObject = URL.parse(formData.elements.apiUrl.value);
			if (urlObject.pathname.indexOf('/api') === -1) {
				this.setState({
					error: 'You need to append the `/api` path to your URL. Please try again!'
				});
			}
			else {
				this.context.app.setApiUrl(formData.elements.apiUrl.value);
			}
		}
	}

	render() {
		let error;

		if (this.state.error) {
			error = (
				<div className="error-message">{this.state.error}</div>
			);
		}

		return (
			<div key="Home" className="app__home">
				<form onSubmit={this.onSubmitForm}>
					<fieldset className="form-group">
						<label labelFor="apiUrl">
							<h2>API URL</h2>
							<p>Enter you Airtime radio api below.<br/>You have to enable the "Public Airtime API" in you radio's settings</p>
						</label>
						<input type="text" className="form-control" id="apiUrl" placeholder="https://radio.airtime.pro/api/" required />
					</fieldset>
					{error}
					<button type="submit" className="btn btn-primary">Submit</button>
				</form>
			</div>
		);
	}
}


export default Home;
