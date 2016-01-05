import React from 'react';

class Header extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	static propTypes = {
		description: React.PropTypes.string,
		logo: React.PropTypes.string,
		name: React.PropTypes.string
	};

	render() {
		const props = this.props;
		let html;

		if (props.name) {
			html = (
				<div>
					{props.logo ? <img src={props.logo} alt={props.name} /> : ''}
					<h1>{props.name}</h1>
					<h3>{props.description}</h3>
				</div>
			);
		}
		else {
			html = (
				<h1 className="stationless">Hadio</h1>
			);
		}

		return (
			<header className="app__header clearfix">
				{html}
			</header>
		);
	}
}

export default Header;
