# Changelog

## [2.0.0](https://github.com/Ricwolf19/uploaderkit/compare/uploaderkit-1.0.0...uploaderkit-2.0.0) (2026-09-13)


### ⚠ BREAKING CHANGES

* **i18n:** UploaderLabels gains thirteen keys, so an object built by hand rather than spread over DEFAULT_LABELS no longer satisfies the type. Validation, transport and HTTP messages now default to English like the rest of the package — a Spanish app selects ES_LABELS through UploaderProvider on the client and createStorage({ labels }) on the server. FILE_CATEGORY_CONFIG labels are English.
* **react:** DEFAULT_LABELS is English. A Spanish app keeps its copy by adding <UploaderProvider language='es'> at the root.
* **server:** upload() answers an UploadResult — StoredFile plus the keys it deleted. A public url now carries a ?v= content fingerprint so a stable-key overwrite is not served stale from a cache.
* **scopes:** defineScopes and ScopeConfig now come from this layer, and a single-file scope whose key carries the file name sweeps its entity prefix after a successful put.

### Features

* **adapters:** add gcs, s3 and memory providers ([9ebfb30](https://github.com/Ricwolf19/uploaderkit/commit/9ebfb30ccfffa9f020736bd78e19daf91c98f34c))
* **i18n:** route every user string through labels ([58a140f](https://github.com/Ricwolf19/uploaderkit/commit/58a140f6b3f83789d49f280c03bdd63e3310c854))
* **i18n:** word every message through labels, on both sides ([8f02c34](https://github.com/Ricwolf19/uploaderkit/commit/8f02c341a900700be82818ea9e17fb2091693b8e))
* **presets:** ship the recipes as components ([130963a](https://github.com/Ricwolf19/uploaderkit/commit/130963ac9389aec7ab4e4bd37a58028a9a6aef5c))
* **react:** add the headless uploader hooks ([7469671](https://github.com/Ricwolf19/uploaderkit/commit/7469671aa1832f7c0edfa0e44e35bfdda23ef9a0))
* **react:** one provider for the copy, one strategy for deletion ([cd8287a](https://github.com/Ricwolf19/uploaderkit/commit/cd8287ae3dc41aa82dcf4ddd4904368704f4bc0a))
* **react:** reach an api that authenticates with a cookie ([c1e7992](https://github.com/Ricwolf19/uploaderkit/commit/c1e7992feca7a4465f7c82664f6c0a97948ecf99))
* **react:** read a stored file as bytes, not just as a url ([8dce809](https://github.com/Ricwolf19/uploaderkit/commit/8dce809e0ebbc812b34d8d2a56cc84ca2ef283d6))
* **react:** read arity from the scope and refuse a sweeping slot set ([1541b68](https://github.com/Ricwolf19/uploaderkit/commit/1541b683d13141cf177496fb2c38aa0121824470))
* **scopes:** derive what an upload replaces from the scope ([db038ec](https://github.com/Ricwolf19/uploaderkit/commit/db038ecb8f4e373a651a168559955eef55edc9fb))
* **server:** add storage service with an encrypted view route ([bf2a71b](https://github.com/Ricwolf19/uploaderkit/commit/bf2a71bd3fd9d48d474b682afdc56866ee7db609))
* **server:** read without holding the object in memory ([753033b](https://github.com/Ricwolf19/uploaderkit/commit/753033b772e5f90ffb1920077690c7d30ab71e52))
* **server:** sweep orphans and report what an upload removed ([7da3c80](https://github.com/Ricwolf19/uploaderkit/commit/7da3c80c6fcfcc08772b3d8ad736f10e1599b0ce))
* **ui:** add the styled uploaders, viewer and confirm dialog ([4aa0e51](https://github.com/Ricwolf19/uploaderkit/commit/4aa0e51863661fafc0014e18f22a5aa68c8fb84b))
* **ui:** give the viewer download, open and a real error state ([8f9d5a5](https://github.com/Ricwolf19/uploaderkit/commit/8f9d5a54e99df7b0bb40594df510f876884b51a1))
* **ui:** hand the file list layout to the screen ([d55001d](https://github.com/Ricwolf19/uploaderkit/commit/d55001d4ec02fbb1be12c2b1fa1c0dcc982819a2))
* **ui:** let a form own when its files travel ([8c77b01](https://github.com/Ricwolf19/uploaderkit/commit/8c77b0186177a32e080e54b5f6c3fcd874ae0f0c))
* **ui:** let the file list sit under the dropzone ([55c702a](https://github.com/Ricwolf19/uploaderkit/commit/55c702a0aaea9fd2c18540a4ffa2c5af1782a9f7))
* **ui:** show a slot that is holding an unsent file ([1bfb00d](https://github.com/Ricwolf19/uploaderkit/commit/1bfb00db90755b7f3368e63ace88cc3ec6343a26))


### Bug Fixes

* **scopes:** judge key traversal by segment, not by substring ([434944e](https://github.com/Ricwolf19/uploaderkit/commit/434944e8a5472e8aadfe46d4a608edf0223e633f))
* **ui:** answer Escape only in the topmost overlay ([4d5a934](https://github.com/Ricwolf19/uploaderkit/commit/4d5a934d6cec4294e9097031a4b4cc5ae7616871))
* **ui:** correct three things the file viewer got wrong about blobs and pdfs ([34a0a11](https://github.com/Ricwolf19/uploaderkit/commit/34a0a11af8962525abb88d108e109ab4d469ec13))
* **ui:** share one scroll-lock counter across packages ([28338c8](https://github.com/Ricwolf19/uploaderkit/commit/28338c86cfd745959a4ecdf5b335133346f49ba0))

## 1.0.0 (2026-08-13)


### Features

* isomorphic upload core with scope registry ([6a3fc2d](https://github.com/Ricwolf19/uploaderkit/commit/6a3fc2daf4d71cc0db6445c2cadaea3a709266c0))
