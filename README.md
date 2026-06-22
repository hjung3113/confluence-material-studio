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

### 1. HTML 초안 가져오기

왼쪽 패널에 `Draft title`과 `HTML draft`를 입력한 뒤 `Import HTML draft`를 누릅니다.

가져온 HTML은 `packages/core`의 sanitizer/import pipeline을 통과해 `ProjectDoc`으로 변환되고, 중앙 canvas와 오른쪽 inspector/export 정보가 갱신됩니다.

예제 데이터를 빠르게 열고 싶을 때는 보조 버튼을 사용합니다.

- `Confluence friendly`: Confluence macro 후보와 fragment 위험을 확인하는 HTML 예제
- `Markdown outline`: Markdown/outline import 예제
- `Hostile HTML`: script, inline handler, remote resource, JavaScript URL 제거/경고 예제

### 2. 섹션 탐색

왼쪽 `Sections` 영역은 import된 문서의 section 목록입니다.

섹션 버튼을 누르면 해당 section이 선택됩니다. 선택된 section은 inspector 작업의 기준이 됩니다.

### 3. 라이브 canvas 확인

중앙 `Live canvas`는 `renderTree`를 기반으로 렌더링한 미리보기입니다.

상단의 `desktop`, `tablet`, `mobile` 버튼으로 preview width를 바꿀 수 있습니다. 이 기능은 Confluence 폭 제약과 독립 HTML 미리보기를 비교하기 위한 MVP 수준의 확인 도구입니다.

### 4. 텍스트와 테마 편집

오른쪽 `Inspector`에서 다음 작업을 할 수 있습니다.

- `Select title`: 첫 title 노드를 선택
- `Selected text`: 선택 노드의 텍스트 수정
- `Apply text`: 수정한 텍스트를 canvas와 export output에 반영
- `Accent`: theme token의 accent 색상 변경
- `Move section up`: 선택 section 순서 위로 이동
- `Move section down`: 선택 section 순서 변경
- `Duplicate section`: 선택 section 복제
- `Delete section`: 선택 section 삭제

편집은 app layer에서 `ProjectDoc` mutation으로 처리되며, 시각 출력에 영향을 주는 변경은 `renderTree`에 반영됩니다.

### 5. Export 결과 확인

오른쪽 `Export artifacts`에는 MVP export 4종이 표시됩니다.

- `standalone.html`
- `confluence-fragment.html`
- `compatibility-report.json`
- `native-mapping-report.json`

artifact 버튼을 누르면 현재 export 내용을 오른쪽 preview에서 확인할 수 있습니다. smoke와 core tests에서 `exportProject()`가 네 산출물을 생성하는지 검증합니다.

### 6. Confluence 호환성 확인

`Compatibility warnings`는 export 대상별 위험을 stable rule ID로 보여줍니다.

현재 주요 rule은 다음을 포함합니다.

- `HTML_REMOTE_RESOURCE`
- `HTML_SCRIPT_REMOVED`
- `HTML_INLINE_HANDLER_REMOVED`
- `HTML_JAVASCRIPT_URL`
- `CF_FRAGMENT_FIXED_POSITION`
- `CF_FRAGMENT_VIEWPORT_UNIT`
- `CF_FRAGMENT_GLOBAL_SELECTOR`
- `CF_FRAGMENT_OVERFLOW_RISK`

`Macro candidates`는 Confluence macro 후보 역할을 보여줍니다. 현재 MVP는 `status`, `callout`, `panel`, `expand`, `code`를 macro 후보로 보고합니다.

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

이 명령은 `packages/app`을 build한 뒤, built asset에 MVP editor shell과 Confluence compatibility marker가 포함되어 있는지 확인합니다.

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

## Confluence 호환 경계

`confluence-fragment.html`은 HTML-capable Confluence context를 위한 scoped HTML fragment입니다. 모든 Confluence tenant/editor/storage format에서 그대로 페이지 본문이 된다고 보장하지 않습니다.

`native-mapping-report.json`은 항상 `isConfluencePageBody: false`를 유지합니다. 이 파일은 어떤 node가 native content, macro, fragment, future iframe/Forge 후보인지 설명하는 보고서입니다.

MVP에서 Confluence API publish/update, attachment upload, Forge macro deployment, 실제 storage-format serialization은 범위 밖입니다.

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
