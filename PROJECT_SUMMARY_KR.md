# SVG 에디터 프로젝트 - 전체 요약

## 프로젝트 개요
Svelte 5, TypeScript, Tailwind CSS로 구축된 웹 기반 SVG 에디터입니다. Figma에서 영감을 받은 벡터 그래픽 에디터로 사용자가 SVG 도형을 생성하고 조작할 수 있습니다.

## 기술 스택
- **프레임워크**: Svelte 5 (runes 사용: $state, $derived, $effect)
- **언어**: TypeScript (strict mode)
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: shadcn-svelte
- **빌드 도구**: Vite

## 프로젝트 구조

```
svgedit/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn-svelte UI 컴포넌트
│   │   │   ├── editor/
│   │   │   │   ├── Canvas.svelte          # 팬/줌 기능이 있는 메인 SVG 캔버스
│   │   │   │   ├── Toolbar.svelte         # 그리기 도구가 있는 상단 툴바
│   │   │   │   ├── PropertiesPanel.svelte # 요소 속성을 위한 우측 패널
│   │   │   │   ├── LayersPanel.svelte     # 레이어 관리를 위한 좌측 패널
│   │   │   │   ├── TransformControls.svelte # 선택 상자, 크기 조절 핸들, 회전
│   │   │   │   └── elements/
│   │   │   │       ├── Rectangle.svelte   # 사각형 요소 컴포넌트
│   │   │   │       ├── Circle.svelte      # 원 요소 컴포넌트
│   │   │   │       ├── Ellipse.svelte     # 타원 요소 컴포넌트
│   │   │   │       └── Line.svelte        # 선 요소 컴포넌트
│   │   │   └── shared/                    # 공유 컴포넌트
│   │   ├── stores/
│   │   │   ├── editor.svelte.ts          # 에디터 상태 (도구, 요소)
│   │   │   ├── canvas.svelte.ts          # 캔버스 상태 (viewbox, 줌, 그리드)
│   │   │   ├── selection.svelte.ts       # 선택 상태
│   │   │   └── drawing.svelte.ts         # 그리기 상태
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript 타입 정의
│   │   └── utils/
│   │       └── svg.ts                    # SVG 유틸리티 함수
│   └── routes/
│       └── +page.svelte                  # 메인 에디터 페이지
├── CLAUDE.md                             # 프로젝트 지침 및 가이드라인
└── package.json
```

## 구현된 핵심 기능

### 1. 캔버스 시스템
- **팬**: 마우스 휠 버튼 또는 팬 도구
- **줌**: 마우스 휠 (확대/축소)
- **그리드**: 사용자 정의 가능한 크기의 토글 가능한 그리드 표시
- **ViewBox 관리**: 적절한 좌표 변환을 위한 SVG viewBox

### 2. 그리기 도구
- **선택 도구**: 기본 선택 및 조작
- **팬 도구**: 캔버스 패닝
- **사각형**: 클릭 앤 드래그로 사각형 그리기
- **원**: 클릭 앤 드래그로 원 그리기
- **타원**: 클릭 앤 드래그로 타원 그리기
- **선**: 클릭 앤 드래그로 선 그리기

### 3. 변형 컨트롤
- **선택 상자**: 선택된 요소를 위한 시각적 표시
- **크기 조절 핸들**: 크기 조절을 위한 8개의 핸들 (모서리 4개 + 변 4개)
- **회전 핸들**: 회전을 위한 선택 상자 위의 원형 핸들
- **도형 타입별 다른 동작**:
  - **사각형 & 선**: 핸들이 요소와 함께 회전
  - **원 & 타원**: 핸들이 수평/수직 유지 (회전되지 않음)

### 4. 요소 속성
속성 패널에서 편집 가능한 속성:
- **변형**: X, Y 위치, 회전 각도
- **크기**: 너비, 높이 (해당 도형에 대해)
- **채우기**:
  - 타입 (단색 또는 그라디언트)
  - 단색 채우기를 위한 색상 선택기
  - 그라디언트를 위한 그라디언트 정지점 편집기
  - 투명도 슬라이더
- **선**:
  - 색상 선택기
  - 너비 조정
- **전체 불투명도**: 전역 불투명도 슬라이더

### 5. 레이어 패널
- 이름이 있는 요소 목록
- 요소별 표시/숨김 토글
- 레이어 잠금 (계획 중)
- 순서 변경 (계획 중)

## 상태 관리 아키텍처

### 에디터 스토어 (`editor.svelte.ts`)
```typescript
{
  currentTool: 'select' | 'pan' | 'rectangle' | 'circle' | 'ellipse' | 'line',
  elements: SVGElement[],
  // 메서드: addElement, updateElement, removeElement, getElementById
}
```

### 캔버스 스토어 (`canvas.svelte.ts`)
```typescript
{
  zoom: number,
  viewBox: { x, y, width, height },
  gridSize: number,
  gridVisible: boolean,
  // 메서드: pan, zoomIn, zoomOut, resetZoom, toggleGrid
}
```

### 선택 스토어 (`selection.svelte.ts`)
```typescript
{
  selectedIds: string[],
  // 메서드: select, clearSelection, isSelected
}
```

### 그리기 스토어 (`drawing.svelte.ts`)
```typescript
{
  isDrawing: boolean,
  startPoint: Point | null,
  currentPoint: Point | null,
  previewElement: SVGElement | null,
  // 메서드: startDrawing, updateDrawing, endDrawing, setPreviewElement
}
```

## 타입 정의

### SVGElement 타입
```typescript
type SVGElement = RectangleElement | CircleElement | EllipseElement | LineElement;

interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface RectangleElement {
  id: string;
  type: 'rectangle';
  name: string;
  width: number;
  height: number;
  transform: Transform;
  fill: Fill;
  stroke: Stroke;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

interface CircleElement {
  id: string;
  type: 'circle';
  name: string;
  radius: number;
  transform: Transform;
  fill: Fill;
  stroke: Stroke;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

// EllipseElement 및 LineElement도 유사
```

## 주요 기술 구현

### 1. 좌표 시스템 변환
- **화면 좌표**: 픽셀 단위의 마우스 위치
- **SVG 좌표**: SVG viewBox 단위의 위치
- **변환**: `getScreenCTM()` 행렬 변환 사용

```typescript
const getMousePosition = (event: MouseEvent, svg: SVGSVGElement): Point => {
  const CTM = svg.getScreenCTM();
  if (CTM) {
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  }
  return { x: 0, y: 0 };
};
```

### 2. 크기 조절 핸들 로직 (앵커 포인트 원칙)
**핵심 원칙**: 핸들을 드래그할 때 반대편 핸들은 고정되고, 요소의 중심은 두 핸들 사이의 중점입니다.

**원 구현** (TransformControls.svelte의 218-305번 줄):
```typescript
// 원을 바운딩 박스 표현으로 변환
let topLeftX = initialCenterX - initialRadius;
let topLeftY = initialCenterY - initialRadius;
let newWidth = initialRadius * 2;
let newHeight = initialRadius * 2;

// 크기 조절 로직 적용 (사각형과 동일)
switch (dragHandle) {
  case 'bottom-right':
    newWidth += dx;
    newHeight += dy;
    break;
  // ... 다른 케이스들
}

// 원으로 다시 변환
const newX = topLeftX + newWidth / 2;
const newY = topLeftY + newHeight / 2;
const newRadius = (newWidth + newHeight) / 4; // 원형 유지를 위한 평균
```

### 3. 회전 처리
**사각형과 선의 경우**: 핸들이 요소와 함께 회전 (회전된 `<g>` 내부)
```svelte
<g transform="rotate({rotation} {centerX} {centerY})">
  <!-- 선택 상자 및 핸들 -->
</g>
```

**원과 타원의 경우**: 핸들이 축 정렬 상태 유지 (회전 외부)
```svelte
<g transform="rotate({rotation} {centerX} {centerY})">
  <!-- 선택 상자만 회전 -->
</g>
<!-- 핸들은 외부, 회전되지 않음 -->
```

### 4. 실시간 핸들 위치 업데이트
**문제**: 드래그 중 핸들이 현재 요소 상태에서 계산되어 움직임.

**해결책**: 드래그 작업 중 `initialBounds` 사용 (321-334번 줄):
```typescript
const handles = $derived(() => {
  // bounds()를 사용하여 드래그 중 핸들을 실시간 업데이트
  const b = bounds();
  return [
    { type: 'top-left', x: b.x, y: b.y },
    { type: 'bottom-right', x: b.x + b.width, y: b.y + b.height },
    // ... 다른 핸들들
  ];
});
```

## 설계 결정

### 1. 실행 취소/다시 실행 없음
- 핵심 편집 기능에 집중하기 위한 간소화된 버전
- 명령 패턴으로 나중에 추가 가능

### 2. Figma에서 영감을 받은 UI
- 깔끔하고 미니멀한 디자인의 라이트 테마
- 우측의 속성 패널
- 좌측의 레이어 패널
- 상단의 툴바

### 3. Svelte 5 Runes
- `$state`: 반응형 상태 변수
- `$derived`: 계산된 값
- `$effect`: 부작용 및 생명주기

### 4. 화살표 함수만 사용
- 일관된 코딩 스타일
- 최신 JavaScript 문법

### 5. 변형 모델
- 모든 요소는 transform 속성을 가짐 (x, y, rotation, scale)
- 도형마다 다른 좌표 시스템 사용:
  - **사각형**: (x, y) = 좌상단 모서리
  - **원/타원**: (x, y) = 중심점
  - **선**: (x, y) = 변형 원점, 상대적인 끝점 사용

## 알려진 문제 및 디버깅

### 최근 디버깅 세션
**문제**: 원 크기 조절 핸들이 제대로 작동하지 않음 - 고정되어야 하는 반대편 핸들이 움직임.

**확인된 근본 원인**:
1. 화면 좌표와 SVG 좌표 혼용
2. 반지름 계산에 대각선 거리 사용 (너비/높이를 사용해야 함)
3. 드래그 중 `initialBounds` 대신 현재 `bounds()` 사용하는 핸들
4. 원/타원 핸들이 회전된 `<g>` 그룹 내부에 잘못 배치됨

**적용된 해결책**:
1. `getMousePosition()`을 사용하여 모든 좌표를 SVG 공간으로 변환
2. 반지름을 위해 바운딩 박스 너비/높이 사용: `radius = width / 2`
3. 드래그 중 실시간 핸들 업데이트를 위해 `bounds()` 사용
4. 렌더링 분리: 사각형/선은 회전된 `<g>`, 원/타원은 비회전
5. 크기 조절 중 원을 바운딩 박스 사각형으로 처리한 후 중심 + 반지름으로 다시 변환

### 현재 상태
크기 조절 시스템이 이제 다음과 같이 올바르게 작동합니다:
- 반대편 핸들이 고정됨 ✓
- 드래그 핸들이 마우스 커서를 따라감 ✓
- 적절한 앵커 포인트 원칙 구현 ✓
- 회전된 도형과 비회전 도형에 대한 다른 처리 ✓

## 향후 개선 사항 (계획)

### Phase 1: 현재 구현
- ✅ 기본 에디터 레이아웃
- ✅ 팬 및 줌
- ✅ 그리드 표시
- ✅ 그리기 도구 (사각형, 원, 타원, 선)
- ✅ 요소 선택
- ✅ 변형 핸들 (크기 조절, 회전)
- ✅ 속성 편집

### Phase 2: 다음 단계
- [ ] 다중 선택 지원
- [ ] 키보드 단축키
- [ ] 요소 삭제 (Delete/Backspace 키)
- [ ] 레이어 순서 변경 (드래그 앤 드롭)
- [ ] 레이어 잠금 기능
- [ ] 요소 복사/붙여넣기

### Phase 3: 고급 기능
- [ ] 사용자 정의 도형을 위한 경로 도구
- [ ] 텍스트 요소
- [ ] 이미지 가져오기
- [ ] 요소 그룹화/그룹 해제
- [ ] 정렬 도구
- [ ] 분산 도구

### Phase 4: 파일 작업
- [ ] SVG 파일로 내보내기
- [ ] SVG 파일 가져오기
- [ ] 프로젝트 상태 저장/로드
- [ ] PNG/JPEG로 내보내기

### Phase 5: 전문 기능
- [ ] 실행 취소/다시 실행 기록
- [ ] 그리드에 스냅
- [ ] 다른 요소에 스냅
- [ ] 가이드 및 눈금자
- [ ] 부울 연산 (합집합, 차집합, 교집합)

## 개발 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션용 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview

# 타입 체크
npm run check

# shadcn-svelte 컴포넌트 추가
npx shadcn-svelte@latest add [component-name]
```

## 코드 스타일 가이드라인

1. **함수**: 화살표 함수만 사용
2. **반응성**: Svelte 5 runes 사용 ($state, $derived, $effect)
3. **TypeScript**: Strict mode 활성화, 명시적 타입
4. **포맷팅**: 일관된 들여쓰기 및 네이밍
5. **주석**: "무엇"보다 "왜"를 설명
6. **파일 구성**: 기능/도메인별로 컴포넌트 그룹화

## 성능 고려사항

1. **파생 값**: 재계산을 피하기 위해 `$derived` 사용
2. **이벤트 처리**: 가능한 경우 이벤트 위임 사용
3. **SVG 렌더링**: 드래그 작업 중 DOM 업데이트 최소화
4. **상태 업데이트**: 여러 번의 재렌더링을 피하기 위해 업데이트 일괄 처리

## 브라우저 호환성

- SVG 2.0을 지원하는 최신 브라우저
- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- IE11: ✗ (Svelte 5로 인해 지원되지 않음)

## 라이선스

명시되지 않음 - 학습/데모 프로젝트입니다.

---

**최종 업데이트**: 2024년 12월
**버전**: 0.1.0 (알파)
**상태**: 활발한 개발 중
