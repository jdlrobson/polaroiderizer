polaroiderizer
==============

turn flickrs on wikipedia commons into polaroids

View the [demo](http://jonrobson.me.uk/wlm/)

embed a Wiki Loves Monuments polaroid widget on your site!
---------------------
If you have jQuery on your site you have basic javascript knowledge you can embed a Wiki Loves Monuments widget on your site

html:

	<div id="wlm-stream-widget" ></div>

javascript:

	( function( $ ) {
		$( '<link rel="stylesheet" >' ).attr( 'href', 'http://jonrobson.me.uk/wlm/p.css' ).appendTo( document.head );
		$.getScript( 'http://jonrobson.me.uk/wlm/polaroiderizer.js', function() {
			polaroiderizer( $( '#wlm-stream-widget' ),
				{
						iiurlwidth: '320px',
						action: 'query',
						gcmsort: 'timestamp', gcmdir: 'desc',
						gcmlimit: 500,
						// SET THE CATEGORY TO PULL FROM HERE
						gcmtitle: 'Category:Images_from_Wiki_Loves_Monuments_2012',
						//gcmtitle: 'Category:Images_from_Wiki_Loves_Monuments_2012_in_the United States',
						generator: 'categorymembers', format: 'json', prop: 'imageinfo', iiprop: 'url|user'
				},
				{
					dropDelay: 3000,
					// CSS PROPERTIES TO ANIMATE ON
					dropAnimation: { opacity: 1, rotate: 40 },
					fadeDuration: 1000,
					dropDuration: 10000,
					source: 'commons',
					rotationRange: 30,
					columns: 'auto',
					pollInterval: 1000 * 60 * 10 // every 10 minutes look for more
				}
			);
		} );
	} ( jQuery ) );
