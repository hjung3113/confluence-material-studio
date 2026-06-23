# Confluence Material Studio

Confluence Material Studio는 사내 발표형 자료를 만들고 편집한 뒤, 독립 실행형 HTML과 Confluence용 산출물로 내보내는 편집 도구입니다.

이 프로젝트는 발표 런타임, PPT 대체재, 범용 HTML IDE가 아닙니다. MVP는 실제 Confluence 네이티브 페이지 본문을 생성하지 않고, `native-mapping-report.json`으로 매핑 가능성과 손실 가능성을 보고합니다.

## 빠른 시작

의존성을 설치합니다.

```bash
npm install
```

전체 검증을 실행합니다.

```bash
npm run verify
```

앱을 개발 모드로 실행합니다.

```bash
npm run app:dev
```

Vite가 출력하는 로컬 주소를 브라우저에서 엽니다. 기본적으로 `http://127.0.0.1:5173` 계열 주소가 표시됩니다.

## 앱 사용법

앱은 `packages/app`에 있는 Vite/TypeScript 기반 MVP 편집 shell입니다. 파싱, sanitizing, export 로직은 직접 구현하지 않고 `packages/core` API를 호출합니다.

### 1. 기본 샘플에서 바로 시작

앱을 열면 `Release Readiness` 샘플 문서가 바로 canvas에 표시됩니다. 먼저 제목을 클릭하고 오른쪽 inspector에서 텍스트를 바꿔 export까지 확인할 수 있습니다.

이 샘플은 앱이 빈 화면으로 시작하지 않도록 하는 개발자용 기본 문서입니다. 실제 사용 시에는 상단 `Import` 버튼으로 HTML 초안을 가져옵니다.

### 2. HTML 초안 가져오기

상단 `Import`를 누르면 오른쪽 drawer가 열립니다. `Draft title`과 `HTML draft`를 입력하거나 `.html` 파일을 선택한 뒤 `Import sanitized HTML`을 누릅니다.

가져온 HTML은 `packages/core`의 sanitizer/import pipeline을 통과해 `ProjectDoc`으로 변환됩니다. raw HTML은 GrapesJS canvas에 직접 들어가지 않고, sanitizer를 통과한 render tree HTML만 미리보기로 로드됩니다.

### 3. 문서 outline과 canvas 선택

왼쪽 `Document outline`은 import된 문서의 주요 node를 보여줍니다. outline 항목을 누르거나 중앙 `Visual canvas`의 텍스트/블록을 클릭하면 해당 node가 선택됩니다.

중앙 canvas는 GrapesJS 기반 시각 미리보기지만, 제품의 원본 모델은 계속 `ProjectDoc`입니다. export는 GrapesJS의 `getHtml()` 결과가 아니라 `packages/core`의 `exportProject()`를 사용합니다.

상단의 `desktop`, `tablet`, `mobile` 버튼으로 preview width를 바꿀 수 있습니다. 이 기능은 기존 MVP 호환성 확인 도구로 유지하지만, 현재 개발 초점은 모바일/태블릿 기능 확장이 아니라 desktop 중심 canvas 편집과 export 경계 안정화입니다.

### 4. 텍스트 편집

오른쪽 `Inspector`는 선택된 node와 Confluence 호환성 힌트를 보여줍니다.

선택된 node가 직접 text child를 가진 경우:

- `Selected text`에서 텍스트를 수정
- `Apply text`로 canvas와 export output에 반영

복합 구조나 보존된 import 구조처럼 직접 텍스트 수정이 안전하지 않은 node는 잠긴 상태로 표시됩니다.

### 5. 제한된 block 추가

왼쪽 `Allowed blocks`는 MVP에서 허용하는 Confluence material block만 보여줍니다.

- `Title`
- `Paragraph`
- `Callout / Note`
- `Divider`

버튼을 누르면 현재 선택된 node 뒤에 block이 추가됩니다. `Add callout` 상단 버튼은 같은 callout 삽입 동작을 빠르게 실행하는 단축 버튼입니다.

### 6. Export 결과 확인

상단 `Export evidence`를 누르면 export drawer가 열리고 MVP export 4종이 표시됩니다.

- `standalone.html`
- `confluence-fragment.html`
- `compatibility-report.json`
- `native-mapping-report.json`

artifact 버튼을 누르면 현재 export 내용을 preview에서 확인할 수 있습니다. smoke와 core tests에서 `exportProject()`가 네 산출물을 생성하는지 검증합니다.

앱 초기 로딩 경로는 schema-heavy ADF export 코드를 바로 불러오지 않습니다. `Export evidence`를 열 때 `packages/core`의 export 경로를 lazy load하고, export 결과는 문서가 바뀌기 전까지 drawer에서 재사용합니다. 문서를 수정하면 오래된 export evidence가 남지 않도록 export drawer를 닫고 cache를 무효화합니다.

### 7. Confluence 호환성 확인

export drawer의 `Compatibility warnings`는 export 대상별 위험을 stable rule ID로 보여줍니다.

현재 주요 rule은 다음을 포함합니다.

- `HTML_REMOTE_RESOURCE`
- `HTML_SCRIPT_REMOVED`
- `HTML_INLINE_HANDLER_REMOVED`
- `HTML_JAVASCRIPT_URL`
- `CF_FRAGMENT_FIXED_POSITION`
- `CF_FRAGMENT_VIEWPORT_UNIT`
- `CF_FRAGMENT_GLOBAL_SELECTOR`
- `CF_FRAGMENT_OVERFLOW_RISK`

`native-mapping-report.json`은 Confluence native/macro/fragment 후보를 보고합니다. 현재 MVP는 `status`, `callout`, `panel`, `expand`, `code`를 macro 후보로 보고하고, ADF draft preview를 포함하지만 실제 Confluence page body로 간주하지 않습니다.

ADF draft preview는 export 시점의 보고서 안에만 들어갑니다. 앱 초기 bundle에는 `@atlaskit/adf-schema`, ProseMirror 계열 코드, `confluenceAdfDraft` marker가 들어가지 않아야 하며, `packages/test-harness`의 app smoke가 이 경계를 검증합니다.

## 검증 명령

core MVP smoke만 실행합니다.

```bash
npm run smoke
```

이 명령은 HTML, Markdown, hostile, Confluence-friendly fixture를 import하고 네 export artifact 생성, hostile output 비활성화, Confluence macro/risk reporting을 확인합니다.

앱 build와 app smoke를 실행합니다.

```bash
npm run app:smoke
```

이 명령은 `packages/app`을 build한 뒤, built asset에 MVP editor shell과 Confluence compatibility marker가 포함되어 있는지 확인합니다. 동시에 초기 app bundle에 다음 marker가 들어가지 않는지도 확인합니다.

- `@atlaskit/adf-schema`
- `prosemirror`
- `nodeFromJSON`
- `confluenceAdfDraft`
- `https://app.grapesjs.com`
- `https://cdnjs.cloudflare.com`

실제 Chrome 기반 canvas 흐름을 확인합니다.

```bash
npm run browser:smoke
```

이 명령은 build된 app을 로컬 static server로 띄운 뒤 Chrome에서 샘플 로드, canvas 선택, 텍스트 편집, 제한 block 삽입, sanitizer import, lazy export drawer, 네 export artifact, `isConfluencePageBody: false`를 확인합니다. 현재 browser smoke는 desktop flow만 검증하며 모바일/태블릿 스크린샷 검증은 중지했습니다.

전체 검증을 실행합니다.

```bash
npm run verify
```

이 명령은 다음을 모두 실행합니다.

- 모든 workspace typecheck
- core Vitest suite
- app model Vitest suite
- test-harness typecheck
- app build
- app smoke

시각 editor 흐름을 바꾸거나 export drawer/lazy loading을 바꾼 경우에는 `npm run verify`에 더해 `npm run browser:smoke`까지 실행합니다.

## Confluence 호환 경계

`confluence-fragment.html`은 HTML-capable Confluence context를 위한 scoped HTML fragment입니다. 모든 Confluence tenant/editor/storage format에서 그대로 페이지 본문이 된다고 보장하지 않습니다.

`native-mapping-report.json`은 항상 `isConfluencePageBody: false`를 유지합니다. 이 파일은 어떤 node가 native content, macro, fragment, future iframe/Forge 후보인지 설명하는 보고서입니다.

MVP에서 Confluence API publish/update, attachment upload, Forge macro deployment, 실제 storage-format serialization은 범위 밖입니다.

GrapesJS는 app-layer canvas adapter로만 사용합니다. 기본 builder panel/block/style manager를 제품 기능으로 열지 않고, telemetry와 remote icon CSS 기본값은 app 설정과 build transform에서 차단합니다.

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

현재 일부 sandbox 환경에서는 로컬 HTTP listen이나 `file://` browser open이 막힐 수 있습니다. 이 경우 `npm run app:smoke`는 서버를 열지 않고 build artifact를 디스크에서 직접 검증합니다.

Confluence native page export가 필요하면 먼저 `docs/confluence/export-targets.md`에 export contract를 추가해야 합니다. MVP는 native page body 생성을 약속하지 않습니다.
