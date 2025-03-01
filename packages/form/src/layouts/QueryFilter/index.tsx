/* eslint-disable no-param-reassign */
import React, { useState, ReactElement, useMemo } from 'react';
import { Row, Col, Form, Divider } from 'antd';
import { FormInstance, FormProps } from 'antd/lib/form/Form';
import RcResizeObserver from 'rc-resize-observer';
import { useIntl } from '@ant-design/pro-provider';
import { isBrowser } from '@ant-design/pro-utils';
import useMergedState from 'rc-util/lib/hooks/useMergedState';

import BaseForm, { CommonFormProps } from '../../BaseForm';
import Actions, { ActionsProps } from './Actions';

const CONFIG_SPAN_BREAKPOINTS = {
  xs: 513,
  sm: 513,
  md: 785,
  lg: 1057,
  xl: 1057,
  xxl: Infinity,
};
/**
 * 配置表单列变化的容器宽度断点
 */
const BREAKPOINTS = {
  vertical: [
    // [breakpoint, cols, layout]
    [513, 1, 'vertical'],
    [785, 2, 'vertical'],
    [1057, 3, 'vertical'],
    [Infinity, 4, 'vertical'],
  ],
  default: [
    [513, 1, 'vertical'],
    [701, 2, 'vertical'],
    [1062, 3, 'horizontal'],
    [1352, 3, 'horizontal'],
    [Infinity, 4, 'horizontal'],
  ],
};

/**
 * 合并用户和默认的配置
 * @param layout
 * @param width
 */
const getSpanConfig = (
  layout: FormProps['layout'],
  width: number,
  span?: SpanConfig,
): { span: number; layout: FormProps['layout'] } => {
  if (width === 16) {
    return {
      span: 8,
      layout: 'inline',
    };
  }
  if (span && typeof span === 'number') {
    return {
      span,
      layout,
    };
  }
  const spanConfig = span
    ? Object.keys(span).map((key) => [CONFIG_SPAN_BREAKPOINTS[key], 24 / span[key], 'horizontal'])
    : BREAKPOINTS[layout || 'default'];

  const breakPoint = (spanConfig || BREAKPOINTS.default).find(
    (item: [number, number, FormProps['layout']]) => width < item[0] + 16, // 16 = 2 * (ant-row -8px margin)
  );
  return {
    span: 24 / breakPoint[1],
    layout: breakPoint[2],
  };
};

export type SpanConfig =
  | number
  | {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };

export type BaseQueryFilterProps = Omit<ActionsProps, 'submitter' | 'setCollapsed' | 'isForm'> & {
  defaultCollapsed?: boolean;
  layout?: FormProps['layout'];
  defaultColsNumber?: number;
  labelWidth?: number | 'auto';
  split?: boolean;
  /**
   * 配置列数
   */
  span?: SpanConfig;

  /**
   * 查询按钮的文本
   */
  searchText?: string;
  /**
   * 重置按钮的文本
   */
  resetText?: string;

  form?: FormProps['form'];
  /**
   * @name 底部操作栏的 render
   * @params searchConfig 基础的配置
   * @params props 更加详细的配置
   * {
      type?: 'form' | 'list' | 'table' | 'cardList' | undefined;
      form: FormInstance;
      submit: () => void;
      collapse: boolean;
      setCollapse: (collapse: boolean) => void;
      showCollapseButton: boolean;
   * }
   */
  optionRender?:
    | ((
        searchConfig: Omit<BaseQueryFilterProps, 'submitter' | 'isForm'>,
        props: Omit<BaseQueryFilterProps, 'searchConfig'>,
        dom: React.ReactNode[],
      ) => React.ReactNode[])
    | false;
};

const flatMapItems = (items: React.ReactNode[]): React.ReactNode[] => {
  return items.flatMap((item: any) => {
    if (item?.type.displayName === 'ProForm-Group' && !item.props?.title) {
      return item.props.children;
    }
    return item;
  });
};

export type QueryFilterProps = Omit<FormProps, 'onFinish'> &
  CommonFormProps &
  BaseQueryFilterProps & {
    onReset?: () => void;
  };

const QueryFilterContent: React.FC<{
  defaultCollapsed: boolean;
  onCollapse: undefined | ((collapsed: boolean) => void);
  collapsed: boolean | undefined;
  resetText?: string;
  searchText?: string;
  split?: boolean;
  form: FormInstance<any>;
  items: React.ReactNode[];
  submitter?: JSX.Element;
  showLength: number;
  collapseRender: QueryFilterProps['collapseRender'];
  spanSize: {
    span: number;
    layout: FormProps['layout'];
  };
  onReset: QueryFilterProps['onReset'];
  optionRender: BaseQueryFilterProps['optionRender'];
}> = (props) => {
  const intl = useIntl();
  const resetText = props.resetText || intl.getMessage('tableForm.reset', '重置');
  const searchText = props.searchText || intl.getMessage('tableForm.search', '搜索');

  const [collapsed, setCollapsed] = useMergedState<boolean>(() => props.defaultCollapsed, {
    value: props.collapsed,
    onChange: props.onCollapse,
  });

  const { optionRender, collapseRender, split, items, spanSize, showLength, onReset } = props;

  const submitter = useMemo(() => {
    if (!props.submitter) {
      return null;
    }
    return React.cloneElement(props.submitter, {
      searchConfig: {
        resetText,
        submitText: searchText,
      },
      render: optionRender
        ? (_: any, dom: React.ReactNode[]) =>
            optionRender(
              {
                ...props,
                resetText,
                searchText,
              },
              props,
              dom,
            )
        : optionRender,
      onReset,
      ...props.submitter.props,
    });
  }, [props.submitter, optionRender]);

  // totalSpan 统计控件占的位置，计算 offset 保证查询按钮在最后一列
  let totalSpan = 0;
  const itemLength = items.length;
  let lastVisibleItemIndex = itemLength - 1;

  // for split compute
  let currentSpan = 0;

  /**
   * 是否需要展示 collapseRender
   */
  const needCollapseRender = itemLength - 1 >= showLength;
  return (
    <Row gutter={24} justify="start" key="resize-observer-row">
      {flatMapItems(items).map((item: React.ReactNode, index: number) => {
        // 如果 formItem 自己配置了 hidden，默认使用它自己的
        const hidden: boolean =
          (item as ReactElement<{ hidden: boolean }>)?.props?.hidden ||
          (collapsed && (index >= props.showLength || totalSpan >= 24));
        const colSize = React.isValidElement<any>(item) ? item?.props?.colSize : 1;
        const colSpan = Math.min(spanSize.span * (colSize || 1), 24);

        // 每一列的key, 一般是存在的
        const itemKey =
          (React.isValidElement(item) && (item.key || `${item.props?.name}`)) || index;

        currentSpan += colSpan;

        if (React.isValidElement(item) && hidden) {
          return React.cloneElement(item, {
            hidden: true,
            key: itemKey || index,
          });
        }

        if (24 - (totalSpan % 24) < colSpan) {
          // 如果当前行空余位置放不下，那么折行
          totalSpan += 24 - (totalSpan % 24);
        }
        totalSpan += colSpan;
        lastVisibleItemIndex = index;

        const colItem = (
          <Col key={itemKey} span={colSpan}>
            {item}
          </Col>
        );
        if (split && currentSpan % 24 === 0 && index <= lastVisibleItemIndex) {
          return [
            colItem,
            <Divider key="line" style={{ marginTop: -8, marginBottom: 16 }} dashed />,
          ];
        }
        return colItem;
      })}
      {submitter && (
        <Col
          key="submitter"
          span={spanSize.span}
          offset={24 - spanSize.span - (totalSpan % 24)}
          style={{
            textAlign: 'right',
          }}
        >
          <Form.Item label=" " colon={false} className="pro-form-query-filter-actions">
            <Actions
              key="pro-form-query-filter-actions"
              collapsed={collapsed}
              collapseRender={needCollapseRender || currentSpan > 24 ? collapseRender : false}
              submitter={submitter}
              setCollapsed={setCollapsed}
            />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
};

const defaultWidth = isBrowser() ? 0 : 1024;

const QueryFilter: React.FC<QueryFilterProps> = (props) => {
  const {
    collapsed: controlCollapsed,
    layout,
    defaultCollapsed = true,
    defaultColsNumber,
    span,
    searchText,
    resetText,
    optionRender,
    collapseRender,
    onReset,
    onCollapse,
    labelWidth = '80',
    style,
    split,
    ...rest
  } = props;

  const [width, setWidth] = useState(
    () => (typeof style?.width === 'number' ? style?.width : defaultWidth) as number,
  );

  const spanSize = useMemo(() => getSpanConfig(layout, width + 16, span), [width]);

  const showLength = useMemo(
    () =>
      defaultColsNumber !== undefined ? defaultColsNumber : Math.max(1, 24 / spanSize.span - 1),
    [defaultColsNumber, spanSize.span],
  );

  const labelFlexStyle = useMemo(() => {
    if (labelWidth && spanSize.layout !== 'vertical' && labelWidth !== 'auto') {
      return `0 0 ${labelWidth}px`;
    }
    return undefined;
  }, [spanSize.layout, labelWidth]);

  return (
    <RcResizeObserver
      key="resize-observer"
      onResize={(offset) => {
        if (width !== offset.width) {
          setWidth(offset.width);
        }
      }}
    >
      <BaseForm
        {...rest}
        style={style}
        layout={spanSize.layout}
        fieldProps={{
          style: {
            width: '100%',
          },
        }}
        formItemProps={{
          labelCol: {
            flex: labelFlexStyle,
          },
        }}
        groupProps={{
          titleStyle: {
            display: 'inline-block',
            marginRight: 16,
          },
          titleRender: (title) => `${title}:`,
        }}
        contentRender={(items, renderSubmitter, form) =>
          width && (
            <QueryFilterContent
              spanSize={spanSize}
              collapsed={controlCollapsed}
              form={form}
              collapseRender={collapseRender}
              defaultCollapsed={defaultCollapsed}
              onCollapse={onCollapse}
              optionRender={optionRender}
              onReset={onReset}
              submitter={renderSubmitter}
              items={items}
              split={split}
              showLength={showLength}
            />
          )
        }
      />
    </RcResizeObserver>
  );
};

export default QueryFilter;
