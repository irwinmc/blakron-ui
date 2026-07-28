/**
 * 皮肤对齐回归测试
 *
 * 验证 my-game / CLI 模板里那批皮肤和组件 API 是对得上的：
 * - skin part 能被 Component.setSkinPart 正确挂上
 * - 状态切换时 SetProperty 生效（ToggleSwitch 的 knob 滑动）
 * - Panel 的 closeButton / moveArea 被识别
 *
 * 这里手写最关键的几条 skin factory（和 codegen 产物等价），
 * 避免测试里去 import 编译产物。如果 codegen 行为变了，这些用例会先红。
 */
import { describe, it, expect } from 'vitest';
import {
	Skin,
	SetProperty,
	State,
	Button,
	Rect,
	Label,
	ToggleSwitch,
	RadioButton,
	Panel,
	HSlider,
	ProgressBar,
	Component,
	PropertyEvent,
	Group,
	HorizontalLayout,
	VerticalLayout,
} from '../src/index.js';

/** 复刻 ToggleSwitchSkin.exml 编译后的 factory（节选关键状态）。 */
function makeToggleSwitchSkin(): Skin {
	const skin = new Skin();
	skin.skinParts = ['knob'];
	skin.width = 52;
	skin.height = 28;

	const track = new Rect();
	track.width = 52;
	track.height = 28;
	track.fillColor = 0x636e72;

	const knob = new Rect();
	knob.x = 4;
	knob.y = 4;
	knob.width = 20;
	knob.height = 20;
	(skin as unknown as Record<string, unknown>).knob = knob;

	skin.elementsContent = [track, knob];
	skin.states = [
		new State('up'),
		new State('down'),
		new State('disabled'),
		new State('upAndSelected', [
			new SetProperty('knob', 'x', 28),
			new SetProperty('knob', 'fillColor', 0xffffff),
		]),
		new State('downAndSelected', [new SetProperty('knob', 'x', 28)]),
		new State('disabledAndSelected', [new SetProperty('knob', 'x', 28)]),
	];
	return skin;
}

/** 复刻 PanelSkin.exml 编译后的 factory（节选关键 part）。 */
function makePanelSkin(): Skin {
	const skin = new Skin();
	skin.skinParts = ['moveArea', 'titleDisplay', 'closeButton'];
	skin.width = 300;
	skin.height = 200;

	const bg = new Rect();
	bg.width = 300;
	bg.height = 200;

	const moveArea = new Rect();
	moveArea.width = 300;
	moveArea.height = 36;
	(skin as unknown as Record<string, unknown>).moveArea = moveArea;

	const titleDisplay = new Label();
	(skin as unknown as Record<string, unknown>).titleDisplay = titleDisplay;

	const closeButton = new Button();
	closeButton.label = '×';
	(skin as unknown as Record<string, unknown>).closeButton = closeButton;

	skin.elementsContent = [bg, moveArea, titleDisplay, closeButton];
	return skin;
}

describe('skin alignment (my-game / cli template)', () => {
	it('ToggleSwitch knob slides to x=28 when selected', () => {
		const ts = new ToggleSwitch();
		const skin = makeToggleSwitchSkin();
		// 用 protected setSkin 的公开等价路径：直接走 Component 的内部赋值
		// ToggleSwitch 继承 Button 继承 Component，skin 走 setSkinPart 绑定
		(ts as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		const knob = skin.getPart('knob') as Rect;
		expect(knob).toBeInstanceOf(Rect);

		// 初始：未选中，knob 在 x=4
		ts.currentState = 'up';
		(skin as unknown as { currentState: string }).currentState = 'up';
		expect(knob.x).toBe(4);

		// 选中：currentState 切到 upAndSelected，knob 应滑到 x=28
		ts.selected = true;
		// 模拟 commitProperties 把 skin.currentState 同步过去
		(skin as unknown as { currentState: string }).currentState = 'upAndSelected';
		expect(knob.x).toBe(28);
	});

	it('Panel skin exposes closeButton + moveArea + titleDisplay parts', () => {
		const panel = new Panel();
		const skin = makePanelSkin();
		(panel as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		expect(panel.closeButton).toBeInstanceOf(Button);
		expect(panel.moveArea).toBeInstanceOf(Rect);
		expect(panel.titleDisplay).toBeInstanceOf(Label);

		// closeButton 的 skinParts 会被注册到 skin.skinParts
		expect(skin.skinParts).toContain('closeButton');
		expect(skin.skinParts).toContain('moveArea');
		expect(skin.skinParts).toContain('titleDisplay');
	});

	it('Panel title flows through titleDisplay part', () => {
		const panel = new Panel();
		panel.title = 'Hello';
		const skin = makePanelSkin();
		// partAdded 会在绑定 titleDisplay 后写入 title
		(panel as unknown as { _setSkin: (s: Skin) => void })._setSkin(skin);

		expect(panel.titleDisplay?.text).toBe('Hello');
	});

	// ── 复合皮肤：自定义组件 + 多个嵌套 skin part ─────────────────────
	describe('composite skin (settings-screen pattern)', () => {
		/** 一个最小自定义组件，声明多个 skin part，记录 partAdded 调用。 */
		class FakeSettingsScreen extends Component {
			public titleDisplay?: Label;
			public closeButton?: Button;
			public soundToggle?: ToggleSwitch;
			public volumeSlider?: HSlider;
			public readonly added: string[] = [];

			public override partAdded(partName: string, instance: unknown): void {
				super.partAdded(partName, instance);
				this.added.push(partName);
				if (partName === 'titleDisplay' && instance instanceof Label) this.titleDisplay = instance;
				if (partName === 'closeButton' && instance instanceof Button) this.closeButton = instance;
				if (partName === 'soundToggle' && instance instanceof ToggleSwitch) this.soundToggle = instance;
				if (partName === 'volumeSlider' && instance instanceof HSlider) this.volumeSlider = instance;
			}
		}

		function makeSettingsSkin(): Skin {
			const skin = new Skin();
			const title = new Label();
			const closeBtn = new Button();
			const sound = new ToggleSwitch();
			const slider = new HSlider();
			(skin as unknown as Record<string, unknown>).titleDisplay = title;
			(skin as unknown as Record<string, unknown>).closeButton = closeBtn;
			(skin as unknown as Record<string, unknown>).soundToggle = sound;
			(skin as unknown as Record<string, unknown>).volumeSlider = slider;
			skin.skinParts = ['titleDisplay', 'closeButton', 'soundToggle', 'volumeSlider'];
			skin.elementsContent = [title, closeBtn, sound, slider];
			return skin;
		}

		it('binds every named skin part onto the custom component', () => {
			const screen = new FakeSettingsScreen();
			(screen as unknown as { _setSkin: (s: Skin) => void })._setSkin(makeSettingsSkin());

			expect(screen.titleDisplay).toBeInstanceOf(Label);
			expect(screen.closeButton).toBeInstanceOf(Button);
			expect(screen.soundToggle).toBeInstanceOf(ToggleSwitch);
			expect(screen.volumeSlider).toBeInstanceOf(HSlider);
			expect(screen.added.sort()).toEqual(['closeButton', 'soundToggle', 'titleDisplay', 'volumeSlider']);
		});

		it('HSlider dispatches propertyChange(value), not Event.CHANGE', () => {
			// 回归：很多人会用 Event.CHANGE 监听滑块，但 Range 派发的是 propertyChange
			const slider = new HSlider();
			slider.maximum = 100;
			slider.minimum = 0;

			const changeCalls: unknown[] = [];
			const propCalls: string[] = [];
			slider.addEventListener('change', () => changeCalls.push(true));
			slider.addEventListener(PropertyEvent.PROPERTY_CHANGE, e => propCalls.push((e as PropertyEvent).property));

			slider.value = 42;
			// value 走 invalidateProperties，没 stage 时验证循环不会自己跑；
			// 直接调 commitProperties() 强制 flush，触发 setValue → propertyChange
			slider.commitProperties();

			// Range 不派发 Event.CHANGE
			expect(changeCalls).toHaveLength(0);
			// 只派发 propertyChange 且 property === 'value'
			expect(propCalls).toContain('value');
		});
	});

	// ── Group 布局：横/竖排列 ──────────────────────────────────────────
	describe('Group layout (HorizontalLayout / VerticalLayout)', () => {
		it('HorizontalLayout 排列子元素从左到右，按 gap 间隔', () => {
			// 复刻 SettingsScreenSkin 里画质行：Group + HorizontalLayout
			const group = new Group();
			group.width = 528;
			group.height = 48;

			const layout = new HorizontalLayout();
			layout.gap = 16;
			layout.verticalAlign = 'middle';
			group.layout = layout;

			const a = new Rect();
			a.width = 120;
			a.height = 48;
			const b = new Rect();
			b.width = 96;
			b.height = 32;
			const c = new Rect();
			c.width = 96;
			c.height = 32;
			group.elementsContent = [a, b, c];

			// 没 stage，布局不会自己跑；手动调 updateDisplayList flush
			group.updateDisplayList(528, 48);

			// a 在 0；b 跟在 a 后面加 gap；c 再跟一个 gap
			expect(a.x).toBe(0);
			expect(b.x).toBe(120 + 16);
			expect(c.x).toBe(120 + 16 + 96 + 16);
		});

		it('VerticalLayout 排列子元素从上到下，按 gap 间隔', () => {
			const group = new Group();
			group.width = 100;
			group.height = 200;

			const layout = new VerticalLayout();
			layout.gap = 8;
			group.layout = layout;

			const a = new Rect();
			a.width = 100;
			a.height = 40;
			const b = new Rect();
			b.width = 100;
			b.height = 40;
			group.elementsContent = [a, b];

			group.updateDisplayList(100, 200);

			expect(a.y).toBe(0);
			expect(b.y).toBe(40 + 8);
		});
	});

	// ── RadioButton 组互斥 ───────────────────────────────────────────────
	describe('RadioButton groupName 互斥', () => {
		it('选中一个时，同 groupName 的其他自动取消选中', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';

			const rb3 = new RadioButton();
			rb3.groupName = 'quality';
			rb3.value = 'high';

			// 初始全未选中
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(false);
			expect(rb3.selected).toBe(false);

			// 点 rb1（模拟用户点击：RadioButton 是 ToggleButton，点击会 toggle）
			rb1.selected = true;
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);
			expect(rb3.selected).toBe(false);

			// 模拟点击 rb2 — 由于 toggle=true，buttonReleased 会做 selected = !selected
			// 这里直接模拟 selected 从 false → true
			rb2.selected = !rb2.selected;
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
			expect(rb3.selected).toBe(false);

			// 模拟点击 rb3
			rb3.selected = !rb3.selected;
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(false);
			expect(rb3.selected).toBe(true);
		});

		it('EXML 里设 selected="true" 后 groupName 互斥仍生效', () => {
			// 复刻 codegen 的顺序：先设 groupName，再设 selected
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';
			// selected 在 groupName 之后设（EXML 里 selected="true" 的属性就是这个顺序）
			rb2.selected = true;

			const rb3 = new RadioButton();
			rb3.groupName = 'quality';
			rb3.value = 'high';

			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);   // EXML 设的默认选中
			expect(rb3.selected).toBe(false);

			// 点 rb1
			rb1.selected = !rb1.selected;
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);
			expect(rb3.selected).toBe(false);
		});

		it('走 buttonReleased 点击路径时 groupName 互斥仍生效', () => {
			// 这条用例直接调用 Button.buttonReleased()，
			// 专门覆盖旧 bug：buttonReleased 里用 `this._selected = !this._selected`
			// 直接写私有字段会绕过 RadioButton 的 selected setter，导致
			// group.notifySelected 不被触发，同组其他 RadioButton 不会被取消选中。
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';

			// 初始全未选中
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(false);

			// 点击 rb1（走真正的 buttonReleased 路径，而非直接调 setter）
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);

			// 点击 rb2：必须把 rb1 取消选中，否则说明 notifySelected 没被触发
			(rb2 as any).buttonReleased();
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
		});

		it('已选中态再次点击不会取消选中（不可点空整组）', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'quality';
			rb1.value = 'low';

			const rb2 = new RadioButton();
			rb2.groupName = 'quality';
			rb2.value = 'mid';

			// 先选中 rb1
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);

			// 再次点击已选中的 rb1 —— 应保持选中，不能把整组点空
			(rb1 as any).buttonReleased();
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);

			// 点别的 radio 才能切换
			(rb2 as any).buttonReleased();
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
		});
	});
});
