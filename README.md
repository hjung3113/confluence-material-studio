# Confluence Material Studio

Confluence Material Studio는 사내 발표형 HTML 자료를 가져와서 안전하게 편집하고, 독립 실행형 HTML과 Confluence 검토용 산출물로 내보내는 MVP 편집 도구입니다.

이 프로젝트는 발표 런타임, PPT 대체재, 범용 HTML IDE가 아닙니다. MVP는 실제 Confluence 네이티브 페이지 본문을 만들지 않고, `native-mapping-report.json`으로 매핑 가능성과 손실 가능성을 보고합니다.

## 설치

요구 사항:

- Node.js 22 계열
- npm
- Chrome 또는 Chromium. `npm run browser:smoke`는 macOS 기본 Chrome 경로(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`)를 사용합니다.

의존성을 설치합니다.

```bash
npm install
```

전체 검증을 한 번 실행해 로컬 환경을 확인합니다.

```bash
npm run verify
```

## 실행

개발 서버를 실행합니다.

```bash
npm run app:dev
```

터미널에 표시되는 Vite 주소를 브라우저에서 엽니다. 보통 `http://127.0.0.1:5173` 또는 비슷한 로컬 주소가 표시됩니다.

프로덕션 빌드만 확인하려면 다음 명령을 사용합니다.

```bash
npm run app:build
```

## 기본 사용 흐름

### 1. 샘플 문서로 시작

앱을 열면 `Release Readiness` 샘플 문서가 바로 표시됩니다.

1. 중앙 `Visual canvas`에서 제목을 클릭합니다.
2. 오른쪽 `Inspector`의 `Selected text`를 수정합니다.
3. `Apply text`를 눌러 문서에 반영합니다.
4. 상단 `Export evidence`를 눌러 export 산출물을 확인합니다.

샘플은 앱이 빈 화면으로 시작하지 않게 하는 기본 문서입니다. 실제 자료 편집은 `Import`로 HTML을 가져와 진행합니다.

### 2. HTML 가져오기

1. 상단 `Import`를 누릅니다.
2. `Draft title`에 문서 이름을 입력합니다.
3. `HTML draft`에 HTML을 붙여넣거나 `.html` 파일을 선택합니다.
4. `Import sanitized HTML`을 누릅니다.

가져온 HTML은 `packages/core`의 import/sanitizer pipeline을 통과해 `ProjectDoc`으로 변환됩니다. raw HTML은 GrapesJS canvas에 직접 들어가지 않고, sanitizer를 통과한 render tree HTML만 미리보기로 로드됩니다.

브라우저 import 경로는 `@htmleditor/core/browser`의 parse5 기반 sanitizer를 사용합니다. scripts, active embeds, inline handlers, remote resources, `javascript:` URL, CSS import/url 변형은 실행되지 않도록 제거되거나 비활성화됩니다. Node/full core의 직접 `sanitizeHtml()` API는 같은 정책 위에 `sanitize-html` 구조 hardening을 추가로 적용합니다.

### 3. 편집 가능 범위 확인

왼쪽 `Document outline`이나 중앙 canvas에서 node를 선택하면 오른쪽 inspector에 editability badge가 표시됩니다.

- `editable`: 선택한 node의 텍스트를 바로 수정할 수 있습니다.
- `partially-editable`: wrapper/section은 보존 대상이지만 내부 텍스트 target은 수정할 수 있습니다.
- `preserved-only`: 구조 보존 대상이며 MVP에서 직접 편집하지 않습니다.

`Editable text targets`가 보이면 목록에서 내부 텍스트 target을 선택한 뒤 수정합니다. 이 표시는 “시각적으로 보존됨”과 “편집 가능함”을 분리해서 보여주는 evidence입니다.

### 4. 텍스트와 블록 편집

텍스트를 바꾸려면:

1. canvas 또는 outline에서 editable node를 선택합니다.
2. `Selected text`를 수정합니다.
3. `Apply text`를 누릅니다.

블록을 추가하려면 왼쪽 `Allowed blocks`에서 필요한 항목을 누릅니다.

- `Title`
- `Paragraph`
- `Callout / Note`
- `Divider`

상단 `Add callout`은 callout 삽입 단축 버튼입니다.

### 5. 문서 구조 조작

`Document controls`는 선택한 node를 `packages/core` 문서 mutation으로 조작합니다.

- `Duplicate`: 선택한 node를 복제합니다.
- `Delete`: 선택한 node를 삭제합니다. root 문서는 삭제하지 않습니다.
- `Move up` / `Move down`: 같은 부모 안에서 순서를 바꿉니다.

preserved-only/raw 구조처럼 안전하게 구조 조작할 수 없는 node는 버튼이 비활성화되고 이유가 표시됩니다. 버튼이 눌렸는데 조용히 아무 일도 일어나지 않게 만들지 않는 것이 UX 원칙입니다.

### 6. 되돌리기와 theme 수정

상단 `Undo` / `Redo`는 문서 mutation을 되돌리고 다시 적용합니다.

되돌릴 수 있는 작업:

- 텍스트 수정
- block 추가
- duplicate/delete/reorder
- theme token 변경

preview width 변경처럼 문서 내용이 바뀌지 않는 UI 상태는 undo 단위가 아닙니다.

`Theme tokens`에서는 background, text, accent color, font stack, spacing, radius, shadow를 수정할 수 있습니다. 이 값은 임시 DOM 조작이 아니라 `ProjectDoc.themeTokens`에 기록됩니다.

### 7. Import review 읽기

`Import review`는 가져온 자료의 안전성, 편집 가능성, export 영향 범위를 보여줍니다.

- `Sanitizer warnings`: script, inline handler, remote resource, `javascript:` URL 같은 sanitizer rule ID
- `Editability`: editable / partial / preserved node 수
- `Target impact`: export evidence 전에는 import/sanitize 기준의 잠정 영향, export 후에는 실제 compatibility warning 기준의 대상별 영향
- `Source baseline`: 원본 `sourceArtifact`가 audit/fallback 기준으로 보존되는지 여부

### 8. Export evidence 확인

상단 `Export evidence`를 누르면 export drawer가 열리고 MVP export 4종이 표시됩니다.

- `standalone.html`
- `confluence-fragment.html`
- `compatibility-report.json`
- `native-mapping-report.json`

artifact 버튼을 누르면 현재 export 내용을 preview에서 확인할 수 있습니다.

주의할 점:

- export는 GrapesJS의 `getHtml()` 결과가 아니라 `packages/core`의 `exportProject()` 결과입니다.
- `native-mapping-report.json`은 Confluence page body가 아니라 매핑 보고서입니다.
- `confluence-fragment.html`은 HTML-capable Confluence context를 위한 scoped fragment이며, 모든 Confluence tenant/editor/storage format에서 그대로 페이지 본문이 된다고 보장하지 않습니다.

## 자주 쓰는 명령

개발 서버:

```bash
npm run app:dev
```

앱 빌드:

```bash
npm run app:build
```

core MVP smoke:

```bash
npm run smoke
```

앱 build artifact smoke:

```bash
npm run app:smoke
```

실제 Chrome 기반 browser smoke:

```bash
npm run browser:smoke
```

전체 검증:

```bash
npm run verify
```

시각 editor 흐름, export drawer, lazy loading, sanitizer boundary를 바꾼 경우에는 최소한 다음 두 명령을 모두 실행합니다.

```bash
npm run browser:smoke
npm run verify
```

## 검증 범위

`npm run verify`는 다음을 실행합니다.

- 모든 workspace typecheck
- core Vitest suite
- app model Vitest suite
- test-harness typecheck
- app build
- app smoke

`npm run browser:smoke`는 실제 Chrome에서 다음 operator flow를 실행합니다.

- 샘플 문서 로드
- canvas 선택과 텍스트 편집
- editability badge와 editable target selector 확인
- duplicate/delete/reorder와 undo/redo 확인
- theme token 변경 확인
- hostile HTML import 후 sanitizer evidence 확인
- export warning detail 확인
- 네 export artifact와 `isConfluencePageBody: false` 확인
- browser runtime이 외부 CDN/runtime asset을 요청하지 않는지 확인
- GrapesJS canvas와 export path가 lazy boundary를 지키는지 확인

## 기술 경계

`packages/core`는 document model, import, sanitizer, compatibility, export를 소유합니다.

`packages/app`은 UI만 소유하고 제품 로직은 `packages/core` API를 호출합니다.

`packages/test-harness`는 build artifact smoke, browser smoke, fixture verification을 소유합니다.

GrapesJS는 app-layer canvas adapter로만 사용합니다. 기본 builder panel/block/style manager를 제품 기능으로 열지 않고, telemetry와 remote icon CSS 기본값은 app 설정과 build 검증에서 차단합니다.

앱 초기 bundle에는 schema-heavy ADF export code, `sanitize-html`, GrapesJS runtime이 직접 들어가지 않아야 합니다. export path와 canvas adapter는 lazy load됩니다.

## 프로젝트 구조

- `packages/core`: document model, import, sanitizer, compatibility, export
- `packages/app`: MVP editor shell과 UI state/mutation
- `packages/test-harness`: smoke/build artifact verification
- `fixtures/`: HTML, Markdown, hostile, Confluence-friendly fixture
- `docs/product`: 제품 범위
- `docs/architecture`: render tree, overlay, editor boundary
- `docs/confluence`: export target, compatibility rule, macro mapping
- `docs/testing`: fixture catalog와 verification strategy

## 주요 문서

- `docs/product/mvp-scope.md`
- `docs/architecture/import-export-pipeline.md`
- `docs/architecture/editor-boundaries.md`
- `docs/confluence/export-targets.md`
- `docs/confluence/compatibility-rules.md`
- `docs/confluence/macro-mapping.md`
- `docs/testing/fixture-catalog.md`
- `docs/testing/verification-strategy.md`
- `AGENTS.md`

## 문제 해결

`npm run app:dev` 실행 후 포트가 이미 사용 중이면 Vite가 다른 포트를 제안합니다. 터미널에 표시된 URL을 사용하면 됩니다.

`npm run browser:smoke`가 Chrome 경로 문제로 실패하면 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`에 Chrome이 설치되어 있는지 확인합니다.

일부 sandbox 환경에서는 로컬 HTTP listen이나 browser open이 막힐 수 있습니다. 이 경우 `npm run app:smoke`는 서버를 열지 않고 build artifact를 디스크에서 검증합니다.

Confluence native page export가 필요하면 먼저 `docs/confluence/export-targets.md`에 export contract를 추가해야 합니다. MVP는 native page body 생성을 약속하지 않습니다.
