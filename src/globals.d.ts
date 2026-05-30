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

/*
 * @wordpress/block-editor ships runtime exports but does not declare a
 * `types` entry point in its package.json, so TypeScript cannot resolve its
 * bundled declarations. The removed `@types/wordpress__block-editor` stub
 * pinned `@types/react@18` and blocked the React 19 toolchain alignment, so
 * we provide a minimal ambient declaration for the editor primitives used here.
 */
declare module '@wordpress/block-editor' {
	export const useBlockProps: ( props?: Record< string, any > ) => Record< string, any >;
	export const InspectorControls: any;
	export const InnerBlocks: any;
}
