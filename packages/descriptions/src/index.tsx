import React, { useEffect } from 'react';
import { Descriptions, Space, Form } from 'antd';
import { EditOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import toArray from 'rc-util/lib/Children/toArray';
import ProForm, { ProFormField } from '@ant-design/pro-form';
import { ProFieldFCMode } from '@ant-design/pro-field';
import {
  InlineErrorFormItem,
  LabelIconTip,
  ProSchema,
  ProCoreActionType,
  RowEditableConfig,
  useEditableMap,
  UseEditableMapUtilType,
  getFieldPropsOrFormItemProps,
  ProFieldValueType,
} from '@ant-design/pro-utils';
import get from 'rc-util/lib/utils/get';
import { stringify } from 'use-json-comparison';
import ProSkeleton from '@ant-design/pro-skeleton';
import { FormInstance, FormProps } from 'antd/lib/form';
import { DescriptionsItemProps } from 'antd/lib/descriptions/Item';
import { DescriptionsProps } from 'antd/lib/descriptions';
import useFetchData, { RequestData } from './useFetchData';

export type ProDescriptionsItemProps<T = {}> = ProSchema<
  T,
  Omit<DescriptionsItemProps, 'children'> & {
    // 隐藏这个字段，是个语法糖，方便一下权限的控制
    hide?: boolean;
    plain?: boolean;
    copyable?: boolean;
    ellipsis?: boolean;
    mode?: ProFieldFCMode;
    children?: React.ReactNode;
  }
>;
export type ProDescriptionsActionType = ProFieldValueType;

export type ProDescriptionsProps<RecordType = {}> = DescriptionsProps & {
  /**
   * params 参数
   * params 改变的时候会触发 reload
   */
  params?: { [key: string]: any };
  /**
   * 网络请求报错
   */
  onRequestError?: (e: Error) => void;
  /**
   * 获取数据的方法
   */
  request?: (params: { [key: string]: any }) => Promise<RequestData>;

  columns?: ProDescriptionsItemProps<RecordType>[];

  /**
   * 一些简单的操作
   */
  actionRef?: React.MutableRefObject<ProCoreActionType<any> | undefined>;

  loading?: boolean;

  tooltip?: string;
  /**
   * @deprecated 你可以使用 tooltip，这个更改是为了与 antd 统一
   */
  tip?: string;
  /**
   * form props 的相关配置
   */
  formProps?: FormProps;
  /**
   * @name 编辑相关的配置
   */
  editable?: RowEditableConfig<RecordType>;
  /**
   * 默认的数据源
   */
  dataSource?: RecordType;
  /**
   * 受控数据源改变
   */
  onDataSourceChange?: (value: RecordType) => void;
};

/**
 * 根据 dataIndex 获取值，支持 dataIndex 为数组
 * @param item
 * @param entity
 */
const getDataFromConfig = (item: ProDescriptionsItemProps, entity: any) => {
  const { dataIndex } = item;
  if (dataIndex) {
    const data = Array.isArray(dataIndex)
      ? get(entity, dataIndex as string[])
      : entity[dataIndex as string];

    if (data !== undefined || data !== null) {
      return data;
    }
  }
  return item.children as string;
};

/**
 * 这里会处理编辑的功能
 * @param props
 */
export const FieldRender: React.FC<
  ProDescriptionsItemProps<any> & {
    text: any;
    valueType: ProFieldValueType;
    entity: any;
    action: ProCoreActionType<any>;
    index: number;
    editableUtils?: UseEditableMapUtilType;
  }
> = (props) => {
  const {
    valueEnum,
    action,
    index,
    text,
    entity,
    mode,
    render,
    editableUtils,
    valueType,
    plain,
    dataIndex,
    request,
    renderFormItem,
    params,
  } = props;

  const fieldConfig = {
    text,
    valueEnum,
    mode: mode || 'read',
    proFieldProps: {
      render: render
        ? () =>
            render?.(text, entity, index, action, {
              ...props,
              type: 'descriptions',
            })
        : undefined,
    },
    ignoreFormItem: true,
    valueType,
    request,
    params,
    plain,
  };
  /**
   * 如果是只读模式，fieldProps 的 form是空的，所以需要兜底处理
   */
  if (mode === 'read' || !mode || valueType === 'option') {
    const fieldProps = getFieldPropsOrFormItemProps(props.fieldProps, undefined, {
      ...props,
      rowKey: dataIndex,
      isEditable: false,
    });
    return <ProFormField {...fieldConfig} fieldProps={fieldProps} />;
  }

  return (
    <div
      style={{
        margin: '-5px 0',
        position: 'absolute',
      }}
    >
      <Form.Item noStyle shouldUpdate>
        {(form: FormInstance<any>) => {
          const formItemProps = getFieldPropsOrFormItemProps(props.formItemProps, form, {
            ...props,
            rowKey: dataIndex,
            isEditable: true,
          });
          const fieldProps = getFieldPropsOrFormItemProps(props.fieldProps, form, {
            ...props,
            rowKey: dataIndex,
            isEditable: true,
          });
          const dom = renderFormItem
            ? renderFormItem?.(
                {
                  ...props,
                  type: 'descriptions',
                },
                {
                  isEditable: true,
                  defaultRender: () => <ProFormField {...fieldConfig} fieldProps={fieldProps} />,
                  type: 'descriptions',
                },
                form,
              )
            : undefined;
          return (
            <Space>
              <InlineErrorFormItem
                style={{
                  margin: 0,
                }}
                initialValue={text}
                name={dataIndex}
                {...formItemProps}
              >
                {dom || (
                  <ProFormField
                    {...fieldConfig}
                    // @ts-ignore
                    proFieldProps={{
                      ...fieldConfig.proFieldProps,
                    }}
                    fieldProps={fieldProps}
                  />
                )}
              </InlineErrorFormItem>
              {editableUtils?.actionRender?.(dataIndex || index, form as FormInstance<any>, {
                cancelText: <CloseOutlined />,
                saveText: <CheckOutlined />,
                deleteText: false,
              })}
            </Space>
          );
        }}
      </Form.Item>
    </div>
  );
};

const conversionProProSchemaToDescriptionsItem = (
  items: ProDescriptionsItemProps<any>[],
  entity: any,
  action: ProCoreActionType<any>,
  editableUtils?: UseEditableMapUtilType,
) => {
  const options: JSX.Element[] = [];
  // 因为 Descriptions 只是个语法糖，children 是不会执行的，所以需要这里处理一下
  const children = items.map((item, index) => {
    if (React.isValidElement(item)) {
      return item;
    }
    const {
      valueEnum,
      render,
      renderText,
      mode,
      plain,
      dataIndex,
      request,
      params,
      editable,
      ...restItem
    } = item as ProDescriptionsItemProps;
    const title =
      typeof restItem.title === 'function'
        ? restItem.title(item, 'descriptions', restItem.title)
        : restItem.title;

    const defaultData = getDataFromConfig(item, entity);
    const text = renderText ? renderText(defaultData, entity, index, action) : defaultData;

    //  dataIndex 无所谓是否存在
    // 有些时候不需要 dataIndex 可以直接 render
    const valueType =
      typeof restItem.valueType === 'function'
        ? (restItem.valueType(entity || {}, 'descriptions') as ProFieldValueType)
        : (restItem.valueType as ProFieldValueType);

    const isEditable = editableUtils?.isEditable(dataIndex || index);

    const fieldMode = mode || isEditable ? 'edit' : 'read';

    const showEditIcon =
      editableUtils &&
      fieldMode === 'read' &&
      editable !== false &&
      editable?.(text, entity, index) !== false;

    const Component = showEditIcon ? Space : React.Fragment;

    const field = (
      <Descriptions.Item
        {...restItem}
        key={restItem.label?.toString() || index}
        label={
          <LabelIconTip
            label={title || restItem.label}
            tooltip={restItem.tooltip || restItem.tip}
          />
        }
      >
        <Component>
          <FieldRender
            {...item}
            mode={fieldMode}
            text={text}
            valueType={valueType}
            entity={entity}
            index={index}
            action={action}
            editableUtils={editableUtils}
          />
          {showEditIcon && valueType !== 'option' && (
            <EditOutlined
              onClick={() => {
                editableUtils?.startEditable(dataIndex || index);
              }}
            />
          )}
        </Component>
      </Descriptions.Item>
    );
    // 如果类型是 option 自动放到右上角
    if (valueType === 'option') {
      options.push(field);
      return null;
    }
    return field;
  });
  return {
    options,
    children,
  };
};

const ProDescriptionsItem: React.FC<ProDescriptionsItemProps> = (props) => {
  return <Descriptions.Item {...props}>{props.children}</Descriptions.Item>;
};

const ProDescriptions = <RecordType extends {}>(props: ProDescriptionsProps<RecordType>) => {
  const {
    request,
    columns,
    params = {},
    dataSource,
    onDataSourceChange,
    formProps,
    editable,
    actionRef,
    onRequestError,
    ...rest
  } = props;

  const action = useFetchData<RequestData>(
    async () => {
      const data = request ? await request(params) : { data: {} };
      return data;
    },
    {
      onRequestError,
      effects: [stringify(params)],
      manual: !request,
      dataSource,
      onDataSourceChange,
    },
  );

  /*
   * 可编辑行的相关配置
   */
  const editableUtils = useEditableMap<any>({
    ...props.editable,
    childrenColumnName: undefined,
    dataSource: action.dataSource,
    setDataSource: action.setDataSource,
  });

  /**
   * 支持 reload 的功能
   */
  useEffect(() => {
    if (actionRef) {
      actionRef.current = { reload: action.reload };
    }
  }, [action]);

  // loading 时展示
  // loading =  undefined 但是 request 存在时也应该展示
  if (action.loading || (action.loading === undefined && request)) {
    return <ProSkeleton type="descriptions" list={false} pageHeader={false} />;
  }

  const getColumns = () => {
    // 因为 Descriptions 只是个语法糖，children 是不会执行的，所以需要这里处理一下
    const childrenColumns = toArray(props.children).map((item) => {
      const {
        valueEnum,
        valueType,
        dataIndex,
        request: itemRequest,
      } = item.props as ProDescriptionsItemProps;

      if (!valueType && !valueEnum && !dataIndex && !itemRequest) {
        return item;
      }
      return item.props;
    });
    return [...childrenColumns, ...(columns || [])].filter((item) => {
      if (['index', 'indexBorder'].includes(item.valueType)) {
        return false;
      }
      return !item.hideInDescriptions;
    });
  };

  const { options, children } = conversionProProSchemaToDescriptionsItem(
    getColumns(),
    action.dataSource || {},
    actionRef?.current || action,
    editable ? editableUtils : undefined,
  );

  /**
   *  如果不是可编辑模式，没必要注入 ProForm
   */
  const FormComponent = editable ? ProForm : (dom: { children: any }) => dom.children;

  return (
    <FormComponent component={false} submitter={false} {...formProps} onFinish={undefined}>
      <Descriptions
        {...rest}
        extra={
          rest.extra ? (
            <Space>
              {options}
              {rest.extra}
            </Space>
          ) : (
            options
          )
        }
        title={<LabelIconTip label={rest.title} tooltip={rest.tooltip || rest.tip} />}
      >
        {children}
      </Descriptions>
    </FormComponent>
  );
};

ProDescriptions.Item = ProDescriptionsItem;

export default ProDescriptions;
