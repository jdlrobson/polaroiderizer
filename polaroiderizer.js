/* global jQuery, window */
/*jslint sloppy: true, white:true, maxerr: 50, indent: 4, plusplus: true, vars:true */
/*******************************************************************
******polaroiderizer******
A fork of the original ( http://polaroiderizer.com/) by Phil Hawksworth (http://hawksworx.com/)

usage:
*** polaroiderizer( element, data, options )
flickr usage:
*** polaroiderizer( $('#container' ), {
-                                       'tags': 'wikilovesmonuments',
-                                       api_key: '----',
-                                       per_page: 100
-                               }, { source: 'flickr' } );
***
*******************************************************************/

( function( $ ) {
var displayQueue = [],
	backlog = {}, // backlog of photos that we currently have in memory where keys are image url
	qPos = 0, timer = null, zIndex = 4,
	columnNumber = 0, // flag to make sure alternate between left and right side
	currentStack = [];

$.fn.addPolaroid = function( el, options ) {
	var $parent = this,
		$el = $( el ),
		rotateStr, style, num = parseInt( Math.random() * ( options.rotationRange ), 10 ),
		$frame, $photo,
		w, x, y, leftSide = options.columns - columnNumber < options.columns / 2, // TODO: deal with middle column which is neither left or right
		timeout;
	$parent.find( 'div.plain' ).remove();
	if ( leftSide ) {
		num = -num;
	}
	rotateStr = 'rotate(' + num + 'deg)';
	style = {
		'-webkit-transform': rotateStr,
		'-moz-transform': rotateStr,
		'-o-transform': rotateStr,
		'-ms-transform': rotateStr,
		'transform': rotateStr,
		'max-width': options.maxImageWidth + 'px'
	};
	$frame = $( '<div class="polaroid"></div>' ).css( style ).append( el );
	$photo = $el.find( 'img' );
	if( currentStack.indexOf( $photo.attr( 'src' ) ) > -1 ) {
		return; // don't place duplicates
	}
	currentStack.push( $photo.attr( 'src' ) );

	$parent.append( $frame );

	// set starting point
	w = $parent.width();
	y = $frame.height();
	x = 40 + Math.floor( Math.random() * (  ( w / options.columns ) - $frame.width() - 80 ) );
	x += ( columnNumber * ( w / options.columns ) );
	columnNumber += 1;
	if ( columnNumber > options.columns - 1 ) {
		columnNumber = 0;
	}

	$frame.css( {top: '-'+y+'px', left: x+'px'} );

	// set opacity of photo
	$photo.css( {opacity: '0'} );

	// animate photo opacity and into view
	function animateFrame() {
		$frame.css( 'z-index', '' ).animate( options.dropAnimation, options.dropDuration, function() {
				currentStack[ currentStack.indexOf( $photo.attr( 'src' ) ) ] = null; // hacky. don't care. does job.
				$frame.remove();
			} );
	}
	$frame.animate( { top: '15px' }, 400 );
	$photo.animate( { opacity: '1' }, options.fadeDuration,
		function( picture ) {
			// animate slowly out of view and opacity of entire object.
			animateFrame();
		} );
	function stop() {
		if( timeout ) {
			window.clearTimeout( timeout );
		}
		$photo.stop().css( 'z-index', zIndex ).css( 'opacity', 1 );
		$frame.stop().css( 'z-index', zIndex ).css( 'opacity', 1 );
		zIndex += 1;
	}

	$frame.hover( function() {
			stop();
		}, function() {
			timeout = window.setTimeout( function() {
				animateFrame();
			}, 500 );
		
		} ).mouseover( function() {
			stop();
		} );

	$photo.mouseover( function() {
		stop();
	} ).find( 'img' ).mouseover( function() {
		stop();
	} );
	return this;
};

// Iterate throught the images which are downloaded and ready to display.
function displayNext( $el, options ){
	var i = displayQueue[ qPos ], title, link;
	if( i ) {
		$el.addPolaroid( i, options );
		title = $( i ).find( 'img' ).attr( 'title' );
		link = $( i ).clone().empty().text( title );
		$el.find( '.status' ).html( link );
	} 
	qPos++;
	if ( qPos >= displayQueue.length ) {
		qPos = 0;
	}
	timer = window.setTimeout( function() {
		displayNext( $el, options );
		}, options.dropDelay );
}

// Get photos from the flickr or commons API and add them to the display queue.
function getPhotos( $el, origData, options ) {
	var uri, handler, source = options.source;
	if ( source === 'commons' ) {
		uri = 'http://commons.wikimedia.org/w/api.php?callback=?';
		handler = function( data, callback ) {
			var photos = [];
			if( data && data.query && data.query.pages ) {
				pages = data.query.pages;
			} else {
				pages = [];
			}
			$.each( pages, function( i, pic ) {
				if ( pic.imageinfo && pic.imageinfo[ 0 ] ) {
					var info = pic.imageinfo[ 0 ];
					photos.push( {
						src: pic.imageinfo[ 0 ].thumburl,
						link: pic.imageinfo[ 0 ].descriptionurl,
						title: pic.title,
						author: info.user ? 'by ' + info.user : ''
					} );
				}
			} );
			photos = photos.reverse(); // hack to get sort order we want in chrome
			callback( photos );
		};
	} else {
		uri = 'http://api.flickr.com/services/rest/?method=flickr.photos.search' +
			'&format=json' +
		    '&jsoncallback=?';
		handler = function( data, callback ) {
			var photos = [];
			$.each( data.photos.photo, function( i, pic ) {
				photos.push( {
					src: 'http://farm'+ pic.farm +'.static.flickr.com/'+pic.server+'/'+pic.id+'_'+pic.secret+'.jpg',
					link: 'http://flickr.com/photos/'+pic.owner+'/'+ pic.id,
					title: pic.title
				} );
			} );
			callback( photos );
		};
	}
	$.getJSON( uri, origData || {}, function( data ) {
		handler( data, function( photos ) {
			var i, photo;
			function loadNewImage() {
				var a = $( '<a>' ).attr( 'href', $( this ).data( 'link' ) ).attr( 'target', '_BLANK' ).
					append( $( this ).clone() );
				$( '<span class="caption">' ).text( $( this ).data( 'author' ) ).appendTo( a );
				displayQueue.push( a );
			}
			$el.find( '.status' ).html( 'Found some photos. Making a slideshow...' );
			for( i = 0; i < photos.length; i++ ) {
				photo = photos[ i ];
				//clear it out and start again...
				if ( timer ) {
					window.clearTimeout( timer );
					timer = null;
				}
				if ( !backlog[ photo.src ] ) {
					backlog[ photo.src ] = true;
					$('<img>' ).attr( 'src', photo.src ).data( 'author', photo.author || '' ).data( 'link', photo.link ).attr( 'title', photo.title ).
						css( 'max-width', options.maxImageWidth + 'px' ).
						load( loadNewImage ).
						appendTo( $el.find( '.staging' ) );
				}
			}
			if( photos.length === 0 ) {
				$el.find( '.empty' ).show();
			} else {
				$el.find( '.empty' ).hide();
				displayNext( $el, options );
			}
		} );
	} );
}

var interval;
function polaroiderizer( $el, data, options ) {
	if ( $el.nodeType ) { // allow normal dom elements to be passed as arguments
		$el = $( el );
	}
	$el.addClass( 'polaroiderizer-container' );
	window.clearInterval( interval );
	$el.empty();
	backlog = {};
	displayQueue = [];
	qPos = 0;
	// AVAILABLE OPTIONS
	var defaultOptions = {
		dropDelay: 3000,
		dropAnimation: { // default animation drops each polaroid to bottom of page
			top: $el.height() + 'px',
			opacity: '0'
		},
		fadeDuration: 1000,
		dropDuration: 10000,
		source: 'commons',
		rotationRange: 30,
		columns: 'auto',
		maxImageWidth: 'auto',
		pollInterval: 1000 * 60 * 10 // every 10 minutes look for more
	};
	options = options || {};
	$.extend( defaultOptions, options );
	$( '<div>' ).addClass( 'status' ).appendTo( $el );
	$( '<div>' ).addClass( 'staging' ).hide().appendTo( $el );
	$( '<div>' ).addClass( 'empty' ).text( 'No images found :-(' ).hide().appendTo( $el );
	qPos = 0;
	if ( defaultOptions.columns === 'auto' ) {
		defaultOptions.columns = parseInt( $el.width() / 320, 10 );
	}
	if ( defaultOptions.maxImageWidth === 'auto' ) {
		defaultOptions.maxImageWidth = parseInt( $el.width() / defaultOptions.columns, 10 );
	}
	getPhotos( $el, data, defaultOptions );
	interval = window.setInterval( function() {
		getPhotos( $el, data, defaultOptions );
	}, defaultOptions.pollInterval );
	$el.find( '.status' ).html( 'Please wait while we load some photos' );
}
window.polaroiderizer = polaroiderizer;
}( jQuery ) );

