/**
 * Global type declarations for WordPress editor globals.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare const wp: {
	blocks: {
		parse( content: string ): any[];
	};
	data: {
		select( store: string ): any;
		dispatch( store: string ): any;
		subscribe( callback: () => void ): () => void;
	};
};
