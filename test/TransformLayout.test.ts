// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { BasicLayout, Group, Image } from '../src/index.js';

describe('UI transform layout invalidation', () => {
	it('re-centers a constrained child after state scale changes', () => {
		const parent = new Group();
		const layout = new BasicLayout();
		parent.layout = layout;
		const child = new Image();
		child.width = 330;
		child.height = 125;
		child.horizontalCenter = 0;
		child.verticalCenter = 0;
		parent.addChild(child);

		layout.updateDisplayList(330, 125);
		expect(child.x).toBe(0);
		expect(child.y).toBe(0);

		const invalidate = vi.spyOn(parent, 'invalidateDisplayList');
		child.scaleX = 0.95;
		child.scaleY = 0.95;
		expect(invalidate).toHaveBeenCalled();

		layout.updateDisplayList(330, 125);
		expect(child.x).toBe(8);
		expect(child.y).toBe(3);
	});
});
