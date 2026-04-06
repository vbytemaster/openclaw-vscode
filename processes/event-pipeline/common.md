# Event Pipeline Common

Required path:
`Gateway DTO -> ChatEvent -> Webview DTO -> Webview State/ViewModel`

Required order of work:
1. validate raw DTO;
2. normalize into `ChatEvent`;
3. map to bridge DTO;
4. reduce into webview state;
5. render from view-model only.

Do not:
- classify tools in UI;
- expose raw gateway data to webview;
- add new semantic meaning in transport or renderer.
