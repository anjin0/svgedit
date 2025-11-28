# SVG 에디터 좌표계 시스템 분석

이 문서는 `svgedit` 프로젝트에서 사용되는 좌표계 시스템, 변환 로직, 그리고 관련 파일들에 대한 상세 분석을 다룹니다.

## 1. 좌표 공간 (Coordinate Spaces)

이 프로젝트는 두 가지 주요 좌표 공간을 다룹니다.

### A. 화면 좌표계 (Screen Space)
- **정의**: 브라우저 윈도우 기준의 픽셀 좌표입니다. (예: `MouseEvent.clientX`, `clientY`)
- **특징**: 줌이나 팬 상태와 무관하게 브라우저 창의 좌상단을 (0, 0)으로 합니다.
- **사용처**: 사용자의 마우스 입력(클릭, 드래그)이 최초로 발생하는 지점입니다.

### B. SVG 사용자 좌표계 (User Space)
- **정의**: SVG 캔버스 내부의 논리적 좌표계입니다.
- **특징**: `viewBox` 설정에 따라 원점과 스케일이 달라집니다. 모든 도형 데이터는 이 좌표계를 기준으로 저장됩니다.
- **사용처**: 도형의 위치(`x`, `y`), 크기(`width`, `height`), 변형(`transform`) 데이터 저장.

---

## 2. 좌표 변환 로직 (Coordinate Transformation)

화면 좌표를 SVG 사용자 좌표로 변환하는 것이 핵심입니다.

### 핵심 함수: `getMousePosition`
- **파일**: `src/lib/utils/svg.ts`
- **원리**: SVG의 `getScreenCTM()` (Current Transformation Matrix) 메서드를 사용하여 변환 행렬을 구하고, 이를 역산하여 좌표를 변환합니다.

```typescript
export const getMousePosition = (event: MouseEvent, svg: SVGSVGElement): Point => {
    const CTM = svg.getScreenCTM();
    if (CTM) {
        // 행렬 역변환 공식 적용
        // a, d: 스케일링 (줌)
        // e, f: 이동 (팬)
        return {
            x: (event.clientX - CTM.e) / CTM.a,
            y: (event.clientY - CTM.f) / CTM.d
        };
    }
    return { x: 0, y: 0 };
};
```

이 함수는 캔버스의 줌(Zoom), 팬(Pan), 브라우저 리사이징을 모두 자동으로 보정해 줍니다.

---

## 3. 뷰박스(ViewBox)와 줌/팬 시스템

캔버스의 시점 제어는 `viewBox` 속성을 통해 이루어집니다.

- **관련 파일**: 
  - `src/lib/stores/canvas.svelte.ts` (상태 관리)
  - `src/lib/components/editor/Canvas.svelte` (UI 바인딩)

### ViewBox 구조
```typescript
interface ViewBox {
    x: number;      // 뷰포트 좌상단 X 좌표
    y: number;      // 뷰포트 좌상단 Y 좌표
    width: number;  // 뷰포트 너비
    height: number; // 뷰포트 높이
}
```

### 팬 (Pan) 로직
화면 이동 시 마우스 이동 거리를 현재 줌 레벨로 보정하여 적용합니다.
```typescript
pan = (deltaX: number, deltaY: number) => {
    // 줌이 되어 있을수록(확대될수록) 실제 viewBox 이동량은 작아져야 함
    this.viewBox.x -= deltaX / this.zoom;
    this.viewBox.y -= deltaY / this.zoom;
};
```

### 줌 (Zoom) 로직 (특이사항)
현재 구현(`canvas.svelte.ts`)에서 `zoom` 상태 값은 변경되지만, 이것이 `viewBox`의 `width`/`height`를 직접 변경하는 로직과 연결되어 있는지 확인이 필요합니다. 일반적으로 줌인은 `viewBox`의 `width`/`height`를 줄이는 방식으로 구현됩니다.

---

## 4. 도형별 좌표 기준 (Element Coordinate Systems)

도형의 타입에 따라 `(x, y)` 좌표가 의미하는 기준점(Anchor Point)이 다릅니다.

| 도형 타입 | 기준점 (Anchor) | 크기 속성 | 설명 |
| :--- | :--- | :--- | :--- |
| **Rectangle** | **좌상단 (Top-Left)** | `width`, `height` | 가장 직관적인 좌표계. `x`, `y`가 사각형의 시작점입니다. |
| **Circle** | **중심 (Center)** | `radius` | `x`, `y`가 원의 중심점(`cx`, `cy`)이 됩니다. |
| **Ellipse** | **중심 (Center)** | `radiusX`, `radiusY` | 원과 마찬가지로 중심점 기준입니다. |
| **Line** | **변형 원점 (Origin)** | `x1, y1, x2, y2` | `x`, `y`는 그룹(`g`)의 변형 기준점이 되며, 실제 선의 좌표(`x1` 등)는 이 점에 대한 상대 좌표입니다. |

---

## 5. 변형 컨트롤 (Transform Controls)

선택된 요소를 조작하는 핸들 UI의 좌표 처리 방식입니다.

- **파일**: `src/lib/components/editor/TransformControls.svelte`

### 회전 (Rotation)
- 핸들과 선택 박스는 요소의 회전 각도만큼 회전된 그룹(`<g transform="rotate(...)">`) 내부에 그려집니다.
- 따라서 핸들의 위치 계산(`bounds()`)은 회전이 없는 상태(Local Space)를 가정하고 단순하게 계산할 수 있습니다.

### 리사이징 (Resizing)
- 마우스 드래그는 화면 좌표계(또는 회전되지 않은 SVG 좌표계)에서 발생하지만, 요소는 회전되어 있을 수 있습니다.
- 이를 해결하기 위해 마우스 이동량(`dx`, `dy`)을 요소의 회전 각도 반대 방향으로 회전(역변환)시켜 로컬 축 기준의 변화량을 구합니다.

```typescript
// 마우스 이동 벡터를 요소의 회전 각도만큼 역회전
const rotation = -element.transform.rotation * (Math.PI / 180);
const rotatedDx = dx * cos - dy * sin;
const rotatedDy = dx * sin + dy * cos;
```

이렇게 구한 `rotatedDx`, `rotatedDy`를 사용하여 도형의 너비/높이를 조절합니다.
