# SVG Editor 코드 분석 보고서

이 문서는 Svelte 5와 SvelteKit으로 구현된 웹 기반 SVG 에디터 애플리케이션인 `svgedit`의 코드 구조와 동작 원리를 분석한 결과입니다.

## 1. 개요 및 기술 스택

이 프로젝트는 브라우저에서 벡터 그래픽(SVG)을 생성하고 편집할 수 있는 도구입니다.

*   **프레임워크**: SvelteKit (Svelte 5) - `$state`, `$derived`, `.svelte.ts` 파일 확장자 등 Svelte 5의 최신 반응형 시스템(Runes)을 적극적으로 활용하고 있습니다.
*   **언어**: TypeScript
*   **스타일링**: Tailwind CSS v4
*   **아이콘**: Lucide Svelte
*   **빌드 도구**: Vite

## 2. 전체 프로그램 흐름 (Overall Flow)

애플리케이션은 전형적인 **단방향 데이터 흐름**과 **반응형 상태 관리** 패턴을 따릅니다.

1.  **사용자 입력**: 사용자가 `Toolbar`에서 도구를 선택하거나 `Canvas`에서 마우스 조작을 합니다.
2.  **상태 변경**: 사용자 입력이 Store(`editor.svelte.ts`, `canvas.svelte.ts` 등)의 메서드를 호출하여 상태를 변경합니다.
3.  **반응형 업데이트**: Svelte 5의 Runes 시스템에 의해 상태 변경이 감지되면, 이를 구독하는 컴포넌트(`Canvas`, `PropertiesPanel`, `LayersPanel`)가 자동으로 다시 렌더링됩니다.
4.  **시각적 피드백**: SVG 캔버스에 도형이 그려지거나, 선택 상자가 표시되거나, 속성 패널의 값이 갱신됩니다.

## 3. 주요 파일 및 역할

### 3.1 상태 관리 (Stores) - `src/lib/stores/`

이 앱의 핵심 로직은 `.svelte.ts` 파일로 작성된 Store들에 집중되어 있습니다. 이들은 클래스 기반으로 작성되었으며, `$state`를 사용하여 반응형 상태를 관리합니다.

*   **`editor.svelte.ts`**:
    *   **역할**: 애플리케이션의 중앙 저장소입니다.
    *   **주요 상태**: `elements`(생성된 모든 SVG 요소 배열), `currentTool`(현재 선택된 도구).
    *   **기능**: 요소 추가/수정/삭제, 도구 변경, ID로 요소 찾기 등의 메서드를 제공합니다.
*   **`canvas.svelte.ts`**:
    *   **역할**: 캔버스 뷰포트와 관련된 상태를 관리합니다.
    *   **주요 상태**: `viewBox`(화면 영역), `zoom`(줌 레벨), `gridVisible`(그리드 표시 여부).
    *   **기능**: 줌 인/아웃, 팬(Pan), 그리드 설정 등의 기능을 수행합니다.
*   **`selection.svelte.ts`**:
    *   **역할**: 사용자가 선택한 요소들을 관리합니다.
    *   **주요 상태**: `selectedIds`(선택된 요소들의 ID 배열).
    *   **기능**: 선택 추가/해제, 다중 선택 처리, 선택 여부 확인 등을 담당합니다.
*   **`drawing.svelte.ts`**:
    *   **역할**: 마우스 드래그를 통한 도형 생성(그리기) 과정을 관리합니다.
    *   **주요 상태**: `isDrawing`, `startPoint`, `currentPoint`, `previewElement`.
    *   **기능**: 드로잉 시작/업데이트/종료, 프리뷰 요소 생성 등을 처리합니다.
*   **`transform.svelte.ts`**:
    *   **역할**: 선택된 요소의 변형(이동, 크기 조절, 회전) 상태를 관리합니다.
    *   **주요 상태**: `isTransforming`, `handle`(조작 중인 핸들 위치), `rotateCenterX/Y`.

### 3.2 UI 컴포넌트 (Components) - `src/lib/components/editor/`

*   **`Canvas.svelte`**:
    *   실제 SVG가 렌더링되는 메인 작업 영역입니다.
    *   마우스 이벤트(`mousedown`, `mousemove`, `mouseup`)를 처리하여 그리기, 선택, 이동 로직을 수행합니다.
    *   SVG 요소들을 렌더링하고, 선택된 요소 위에 `TransformControls`를 표시합니다.
*   **`Toolbar.svelte`**:
    *   화면 상단에 위치하며 도구(선택, 사각형, 원, 선, 텍스트 등)를 선택할 수 있게 합니다.
*   **`LayersPanel.svelte`**:
    *   생성된 요소들의 목록을 보여줍니다.
    *   레이어 선택, 가시성 토글(눈 아이콘), 잠금 토글(자물쇠 아이콘) 기능을 제공합니다.
*   **`PropertiesPanel.svelte`**:
    *   선택된 요소의 속성(위치, 크기, 색상, 투명도 등)을 보여주고 편집할 수 있는 패널입니다.
    *   요소 타입에 따라 다른 속성 입력 필드를 동적으로 렌더링합니다.
*   **`TransformControls.svelte`**:
    *   선택된 요소 주위에 나타나는 경계 상자(Bounding Box)와 크기 조절/회전 핸들을 렌더링합니다.
    *   핸들 드래그 시 좌표 변환 로직을 수행하여 요소의 `transform` 속성을 업데이트합니다.

### 3.3 데이터 모델 및 유틸리티 - `src/lib/types/` & `src/lib/utils/`

*   **`src/lib/types/svg.ts`**:
    *   `SVGElement` 타입(Union Type)과 각 도형별(Rectangle, Circle 등) 인터페이스를 정의합니다.
    *   모든 도형은 `BaseSVGElement`를 확장하며, `transform`, `fill`, `stroke` 등의 공통 속성을 가집니다.
*   **`src/lib/utils/svg.ts`**:
    *   `createRectangle`, `createCircle` 등 도형 생성을 위한 팩토리 함수들을 포함합니다.
    *   `getMousePosition`: 화면(Screen) 좌표를 SVG 내부 좌표계(User Coordinate System)로 변환하는 중요한 유틸리티 함수입니다.

## 4. 상호 관계 및 의존성 (Dependencies)

*   **`Canvas.svelte`**는 거의 모든 Store(`editor`, `selection`, `canvas`, `drawing`, `transform`)를 import하여 사용합니다. 이는 Canvas가 앱의 메인 컨트롤러 역할을 하기 때문입니다.
*   **`PropertiesPanel.svelte`**는 `selectionStore`를 감시하다가 선택된 요소가 바뀌면 `editorStore`에서 해당 요소 정보를 가져와 표시합니다(`$derived.by` 사용).
*   **`TransformControls.svelte`**는 복잡한 기하학적 계산(회전된 좌표계에서의 크기 조절 등)을 수행하며, 결과를 `editorStore`를 통해 반영합니다.

## 5. 논리 구조 및 핵심 개념

### 5.1 Svelte 5 Reactivity (반응형성)
이 프로젝트는 Svelte 5의 Runes 구문을 완벽하게 도입했습니다.
*   **`$state`**: 상태 변수 선언. 값이 바뀌면 UI가 자동 업데이트됩니다.
*   **`$derived`**: 다른 상태로부터 파생된 값을 계산합니다. (예: `PropertiesPanel`에서 선택된 요소 가져오기)
*   **`$effect`**: 사이드 이펙트를 처리합니다. (예: `TransformControls`에서 드래그 중 윈도우 이벤트 리스너 등록/해제)

### 5.2 좌표계 변환 (Coordinate System)
SVG 에디터의 핵심은 좌표 변환입니다.
*   **스크린 좌표 -> SVG 좌표**: `getMousePosition` 함수에서 `svg.getScreenCTM()`을 사용하여 마우스 이벤트의 클라이언트 좌표를 SVG 내부 좌표로 변환합니다.
*   **변형(Transform)**: 각 요소는 `transform` 객체(x, y, rotation, scale)를 가지며, 이는 렌더링 시 SVG `transform` 속성 문자열로 변환됩니다.

### 5.3 상태 분리 (Separation of Concerns)
기능별로 Store가 명확히 분리되어 있습니다.
*   **EditorStore**: "무엇이 존재하는가?" (데이터)
*   **SelectionStore**: "무엇을 보고/조작하는가?" (상호작용 대상)
*   **CanvasStore**: "어떻게 보여주는가?" (뷰포트)
*   **Drawing/TransformStore**: "어떤 임시 동작 중인가?" (트랜잭션/인터랙션 상태)

이러한 분리는 코드의 유지보수성을 높이고, 복잡한 인터랙션 로직이 서로 엉키지 않게 도와줍니다.
