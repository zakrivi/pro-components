---
title: ProDescriptions - 定义列表
group:
  path: /
nav:
  title: 组件
  path: /components
  order: 1
---

# ProDescriptions - 高级定义列表

## 何时使用

高级描述列表组件，提供一个更加方便快速的方案来构建描述列表。

ProDescriptions 的诞生是为了解决项目中需要写很多 Descriptions 的样板代码的问题，所以在其中做了封装了很多常用的逻辑。在 React 中写一个 Descriptions 免不了需要定义一些雷同的属性。所以 ProDescriptions 默认封装了请求网络，columns 列展示的逻辑。

比如 ProDescriptions 封装了请求网络的行为，ProDescriptions 会将 props.params 中的数据默认带入到请求中，如果接口恰好与我们的定义相同，实现一个查询会非常简单。

```tsx | pure
import request from 'umi-request';

const fetchData = (params) =>
  request<{
    data: T{};
  }>('https://proapi.azurewebsites.net/github/issues', {
    params,
  });

const keyWords = "Ant Design"

<ProDescriptions<T,U> request={fetchData} />;
```

我们约定 request 拥有一个参数， `params` 会自带 props 中的 `params` 。类型如下:

```tsx | pure
(params: U) => RequestData;
```

对与请求回来的结果的 ProDescriptions 也有一些约定，类型如下：

```tsx | pure
interface RequestData {
  data: Datum{};
  success: boolean;
}
```

## 代码演示

### 基础定义列表

基本使用。

<code src="./demos/base.tsx" />

### 远程请求数据

通过请求接口数据来展示定义列表

<code src="./demos/request.tsx" />

### columns

通过请求接口数据和 columns 来展示定义列表

<code src="./demos/columns.tsx" />

### 可编辑得定义列表

API 与 ProTable 相同

<code src="./demos/editable.tsx" />

## API

### ProDescriptions

> 更多功能查看 antd 的 [Descriptions](https://ant.design/components/descriptions-cn/)

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| title | 描述列表的标题，显示在最顶部 | `ReactNode` | - |
| tooltip | 内容的补充描述，hover 后显示 | `string` | - |
| loading | 展示一个加载的骨架屏，骨架屏和 dom 不会一一对应 | `boolean` | - |
| extra | 描述列表的操作区域，显示在右上方 | `string` \| `ReactNode` | - |
| bordered | 是否展示边框 | boolean | false |
| column | 一行的 `ProDescriptionsItems` 数量，可以写成像素值或支持响应式的对象写法 `{ xs: 8, sm: 16, md: 24}` | number | 3 |
| size | 设置列表的大小。可以设置为 `middle` 、`small`, 或不填（只有设置 `bordered={true}` 生效） | `default` \| `middle` \| `small` | - |
| layout | 描述布局 | `horizontal` \| `vertical` | `horizontal` |
| colon | 配置 `ProDescriptions.Item` 的 `colon` 的默认值 | boolean | true |
| request | 请求数据，不设置 columns 时 ProDescriptions.Item 需设置对应的 dataIndex | - | - |
| columns | 列定义，与 request 配合使用 [columns](/components/table#columns) | - | - |
| editable | 编辑的相关配置 | [EditableConfig]('#editable') | - |

### editable

| 属性 | 描述 | 类型 | 默认值 |
| --- | --- | --- | --- |
| type | 可编辑表格的类型，单行编辑或者多行编辑 | `single` \| `multiple` | - |
| editableKeys | 正在编辑的行，受控属性。 默认 `key` 会使用 `rowKey` 的配置，如果没有配置会使用 `index`，建议使用 rowKey | `React.Key[]` | - |
| actionRender | 自定义编辑模式的操作栏 | `(row: T, config: ActionRenderConfig<T>) => React.ReactNode[]` | - |
| onSave | 保存一行的时候触发，只更新 | `(key: React.Key, row: T,newLine?:newLineConfig) => Promise<boolean>` | - |
| onCancel | 编辑列被修改的时候 | `(key: React.Key, row: T,newLine?:newLineConfig) => Promise<boolean>` | - |
| onChange | 编辑列被修改的时候 | `(editableKeys: React.Key[], editableRows: T[]) => void` | - |

### ProDescriptions.Item

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| label | 内容的描述 | ReactNode | - |
| tooltip | 内容的补充描述，hover 后显示 | string | - |
| span | 包含列的数量 | number | 1 |
| valueType | 格式化的类型 | `ValueType` | - |
| valueEnum | 当前列值的枚举 [valueEnum](/components/table#valueenum) | `{[key:string`\|`number]:any}` | - |
| request | 从网络请求枚举数据 | `()=>Promise<{[key:string`\|`number]:any}>` | - |
| dataIndex | 返回数据的 key 与 ProDescriptions 的 request 配合使用，用于配置式的定义列表 | `React.Text` \| `React.Text[]` | - |
| editable | 在编辑表格中是否可编辑的，函数的参数和 table 的 render 一样 | `false` \| `(text: any, record: T,index: number) => boolean` | true |

> span 是 Description.Item 的数量。 span={2} 会占用两个 DescriptionItem 的宽度。

### ActionRef

在进行了操作，或者 tab 切换等时候我们需要手动触发一下描述列表的更新，纯粹的 props 很难解决这个问题，所以我们提供一个 ref 来支持一些默认的操作。

```tsx | pure
const ref = useRef<ActionType>();

// 两秒刷新一次
useEffect(() => {
  setInterval(() => {
    ref.current.reload();
  }, 2000);
}, []);

// hooks 绑定
<ProDescriptions actionRef={ref} />;

// class
<ProDescriptions actionRef={(ref) => (this.ref = ref)} />;
```

`ActionRef` 还支持了一些别的行为,某些时候会减少的你的编码成本，但是 ref 会脱离 react 的生命周期，所以这些 action 都是不受控的。

```tsx | pure
// 刷新
ref.current.reload();
```
