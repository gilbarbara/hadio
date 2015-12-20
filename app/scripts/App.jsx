import React from 'react';
import ReactDOM from 'react-dom';
import fetchJsonp from 'fetch-jsonp';

import Loader from './components/Loader';

import $ from 'jquery';
import 'jPlayer/dist/jplayer/jquery.jplayer.js';

class Hadio extends React.Component {
	constructor (props) {
		super(props);
		this.state = {
			playerReady: false,
			ready: false,
			station: undefined,
			tracks: undefined
		};

		this.apiUrl = 'https://phr.airtime.pro/api/live-info-v2?';
		this.stream = 'http://phr.out.airtime.pro:8000/phr_a';
		this.$player = undefined;
	}

	componentDidMount () {
		fetchJsonp(this.apiUrl + 'station-metadata&callback=callback', {
			credentials: 'include',
			mode: 'no-cors'
		})
			.then(response => {
				return response.json();
			})
			.then(body => {
				this.setState({
					ready: true,
					station: body.station,
					tracks: body.tracks
				}, () => {
					this.initPlayer();
				});
			})
			.catch(ex => {
				console.log('parsing failed', ex);
			});
	}

	initPlayer () {
		this.$player = $(ReactDOM.findDOMNode(this.refs.player));

		this.$player.jPlayer({
			swfPath: '../dist/jplayer',
			solution: 'html, flash',
			supplied: 'mp3',
			preload: 'none',
			volume: 0.8,
			muted: false,
			backgroundColor: '#000000',
			cssSelectorAncestor: '#jp_container_1',
			cssSelector: {
				videoPlay: '.jp-video-play',
				play: '.jp-play',
				pause: '.jp-pause',
				stop: '.jp-stop',
				seekBar: '.jp-seek-bar',
				playBar: '.jp-play-bar',
				mute: '.jp-mute',
				unmute: '.jp-unmute',
				volumeBar: '.jp-volume-bar',
				volumeBarValue: '.jp-volume-bar-value',
				volumeMax: '.jp-volume-max',
				playbackRateBar: '.jp-playback-rate-bar',
				playbackRateBarValue: '.jp-playback-rate-bar-value',
				currentTime: '.jp-current-time',
				duration: '.jp-duration',
				title: '.jp-title',
				fullScreen: '.jp-full-screen',
				restoreScreen: '.jp-restore-screen',
				repeat: '.jp-repeat',
				repeatOff: '.jp-repeat-off',
				gui: '.jp-gui',
				noSolution: '.jp-no-solution'
			},
			errorAlerts: true,
			warningAlerts: false,
			ready: () => {
				this.setState({
					playerReady: true
				});
				this.$player.jPlayer('setMedia', { mp3: this.stream }).jPlayer('play'); // Attempt to auto play the media
			},
			pause: () => {
				this.$player.jPlayer('clearMedia');
			},
			error: (event) => {
				if (this.state.playerReady && event.jPlayer.error.type === $.jPlayer.error.URL_NOT_SET) {
					// Setup the media stream again and play it.
					this.$player.jPlayer('setMedia', { mp3: this.stream }).jPlayer('play');
				}
			}
		});
	}

	render () {
		const STATE = this.state;
		let html;

		if (STATE.ready) {
			html = (
				<div className="radio-player">
					<div id="jquery_jplayer_1" className="jp-jplayer"></div>
					<div ref="player" className="radio-player--main jp-audio-stream" role="application" aria-label="media player">
						<div className="jp-type-single">
							<div className="jp-gui jp-interface">

								<div className="jp-controls-wrapper clearfix">
									<div className="jp-controls">
										<button className="jp-play btn btn-primary" role="button" tabIndex="0">
											<i className="i-play" />
										</button>
										<button className="jp-pause btn btn-primary" role="button" tabIndex="0">
											<i className="i-pause" />
										</button>
									</div>
									<div className="jp-details">
										<div className="jp-title" aria-label="title">&nbsp;</div>
									</div>
								</div>
								<div className="jp-volume-controls clearfix">
									<a href="#" className="jp-mute" role="button" tabIndex="0"
									   data-icon="&#xe064" />
									<div className="jp-volume-bar">
										<div className="jp-volume-bar-value"></div>
									</div>
									<a href="#" className="jp-volume-max" role="button" tabIndex="2"
									   data-icon="&#xe066" />
								</div>
							</div>
							<div className="jp-no-solution">
								<span>Update Required</span>
								To play the media you will need to either update your browser to a recent version or update your
								<a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.
							</div>
						</div>
					</div>
				</div>
			);
		}
		else {
			html = <Loader />
		}

		console.log('render');

		return (
			<div key="Hadio" className="app">
				<header className="main-header">
					<h1>Hadio</h1>
				</header>

				<main className="main-content">
					{html}
				</main>
				<footer className="main-footer">
					Footer
				</footer>
			</div>
		);
	}
}

export default Hadio;
