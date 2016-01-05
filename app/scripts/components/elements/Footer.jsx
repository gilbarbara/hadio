import React from 'react';

class Footer extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	static propTypes = {
		apiUrl: React.PropTypes.oneOfType([
			React.PropTypes.string,
			React.PropTypes.undefined
		])
	};

	render() {
		return (
			<footer className="app__footer">
				{String(new Date().getFullYear()).replace('20', '2k')} <a href="http://kollectiv.org/" target="_blank">Kollectiv</a>
			</footer>
		);
	}
}

export default Footer;
