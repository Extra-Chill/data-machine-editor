export type CanonicalDiffType = 'edit' | 'replace' | 'insert';
export type CanonicalDiffStatus = 'pending' | 'accepted' | 'rejected';

export interface CanonicalDiffItem {
	blockIndex?: number;
	originalContent?: string;
	replacementContent?: string;
}

export interface CanonicalDiffData {
	diffId: string;
	diffType: CanonicalDiffType;
	originalContent: string;
	replacementContent: string;
	status?: CanonicalDiffStatus;
	summary?: string;
	items?: CanonicalDiffItem[];
	position?: string;
	insertionPoint?: string;
	editor?: Record< string, unknown >;
}

type UnknownRecord = Record< string, unknown >;

function isRecord( value: unknown ): value is UnknownRecord {
	return !! value && typeof value === 'object' && ! Array.isArray( value );
}

export function parseCanonicalDiffFromJson( json: string ): CanonicalDiffData | null {
	try {
		const parsed = JSON.parse( json ) as UnknownRecord;
		const container = isRecord( parsed.data ) ? parsed.data : parsed;
		const rawDiff = isRecord( container.diff ) ? container.diff : container;

		const diffId = typeof rawDiff.diffId === 'string'
			? rawDiff.diffId
			: typeof rawDiff.diff_id === 'string'
				? rawDiff.diff_id
				: typeof container.diff_id === 'string'
					? container.diff_id
					: '';

		const originalContent = typeof rawDiff.originalContent === 'string'
			? rawDiff.originalContent
			: '';
		const replacementContent = typeof rawDiff.replacementContent === 'string'
			? rawDiff.replacementContent
			: '';

		if ( ! diffId && ! originalContent && ! replacementContent ) {
			return null;
		}

		const items = Array.isArray( rawDiff.items )
			? rawDiff.items.map( ( item ) => {
				if ( ! isRecord( item ) ) {
					return null;
				}

				return {
					blockIndex: typeof item.blockIndex === 'number' ? item.blockIndex : undefined,
					originalContent: typeof item.originalContent === 'string' ? item.originalContent : undefined,
					replacementContent: typeof item.replacementContent === 'string' ? item.replacementContent : undefined,
				};
			} ).filter( Boolean ) as CanonicalDiffItem[]
			: undefined;

		return {
			diffId,
			diffType: rawDiff.diffType === 'replace' || rawDiff.diffType === 'insert' ? rawDiff.diffType : 'edit',
			originalContent,
			replacementContent,
			status: rawDiff.status === 'accepted' || rawDiff.status === 'rejected' || rawDiff.status === 'pending'
				? rawDiff.status
				: undefined,
			summary: typeof rawDiff.summary === 'string' ? rawDiff.summary : typeof container.message === 'string' ? container.message : undefined,
			items: items && items.length > 0 ? items : undefined,
			position: typeof rawDiff.position === 'string' ? rawDiff.position : undefined,
			insertionPoint: typeof rawDiff.insertionPoint === 'string' ? rawDiff.insertionPoint : undefined,
			editor: isRecord( rawDiff.editor ) ? rawDiff.editor : undefined,
		};
	} catch {
		return null;
	}
}
