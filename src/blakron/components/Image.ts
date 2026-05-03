import { Component } from './Component.js';
import { Texture, Event, Bitmap, BitmapFillMode, Rectangle } from '@blakron/core';
import { getAssetAdapter } from '../core/AssetAdapterRegistry.js';

/**
 * Image component that displays bitmap data.
 *
 * Supports setting `source` to a URL string (loaded via the asset adapter)
 * or a Texture instance directly.
 *
 * States: none (non-interactive visual element).
 */
export class Image extends Component {
	private _source: string | Texture | undefined;
	private _sourceChanged = false;
	private _bitmap: Bitmap | undefined;

	constructor(source?: string | Texture) {
		super();
		if (source) this.source = source;
	}

	// ── Source ──────────────────────────────────────────────────────────

	get source(): string | Texture | undefined {
		return this._source;
	}

	set source(value: string | Texture | undefined) {
		if (this._source === value) return;
		this._source = value;
		if (value && typeof value === 'string') {
			this._sourceChanged = true;
			this.invalidateProperties();
		} else {
			this.applyTexture((value as Texture) ?? undefined);
		}
	}

	// ── Scale9Grid ──────────────────────────────────────────────────────

	private _scale9Grid: Rectangle | undefined;

	get scale9Grid(): Rectangle | undefined {
		return this._scale9Grid;
	}

	set scale9Grid(value: Rectangle | undefined) {
		if (this._scale9Grid === value) return;
		this._scale9Grid = value;
		if (this._bitmap) this._bitmap.scale9Grid = value;
		this.invalidateDisplayList();
	}

	// ── FillMode ────────────────────────────────────────────────────────

	private _fillMode: BitmapFillMode = BitmapFillMode.SCALE;

	get fillMode(): BitmapFillMode {
		return this._fillMode;
	}

	set fillMode(value: BitmapFillMode) {
		if (this._fillMode === value) return;
		this._fillMode = value;
		if (this._bitmap) this._bitmap.fillMode = value;
		this.invalidateDisplayList();
	}

	// ── Smoothing ───────────────────────────────────────────────────────

	private _smoothing = true;

	get smoothing(): boolean {
		return this._smoothing;
	}

	set smoothing(value: boolean) {
		if (this._smoothing === value) return;
		this._smoothing = value;
		if (this._bitmap) this._bitmap.smoothing = value;
		this.invalidateDisplayList();
	}

	// ── Internal bitmap access ──────────────────────────────────────────

	get bitmap(): Bitmap | undefined {
		return this._bitmap;
	}

	// ── Lifecycle ───────────────────────────────────────────────────────

	override commitProperties(): void {
		super.commitProperties();
		if (this._sourceChanged) {
			this._sourceChanged = false;
			this.parseSource();
		}
	}

	override createChildren(): void {
		super.createChildren();
		if (this._sourceChanged) {
			this._sourceChanged = false;
			this.parseSource();
		}
	}

	private parseSource(): void {
		const source = this._source;
		if (source && typeof source === 'string') {
			const capturedSource = source;
			getAssetAdapter().getAsset(capturedSource, content => {
				if (this._source !== capturedSource) return;
				this.applyTexture(content ?? undefined);
				if (content) {
					this.dispatchEventWith(Event.COMPLETE);
				}
			});
		} else {
			this.applyTexture((source as Texture) ?? undefined);
		}
	}

	private applyTexture(texture: Texture | undefined): void {
		if (!this._bitmap) {
			this._bitmap = new Bitmap();
			this._bitmap.smoothing = this._smoothing;
			this._bitmap.fillMode = this._fillMode;
			if (this._scale9Grid) this._bitmap.scale9Grid = this._scale9Grid;
			this.addChild(this._bitmap);
		}
		this._bitmap.texture = texture;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	override measure(): void {
		const texture = this._bitmap?.texture;
		if (texture) {
			this.setMeasuredSize(texture.textureWidth, texture.textureHeight);
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		if (this._bitmap) {
			this._bitmap.width = unscaledWidth;
			this._bitmap.height = unscaledHeight;
		}
	}
}
