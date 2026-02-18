/**
 * Shadow of ObjectBrowserBody.jsx
 * Changes from original:
 * 1. New handleSelectItem method — ALWAYS selects, never navigates
 * 2. Simplified handleClickOnItem — folderish items ALWAYS navigate (all modes)
 * 3. Removed handleDoubleClickOnItem (no longer needed)
 * 4. Pass handleSelectItem to ObjectBrowserNav
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { Input, Segment, Breadcrumb } from 'semantic-ui-react';

import join from 'lodash/join';

import { searchContent } from '@plone/volto/actions/search/search';
import Icon from '@plone/volto/components/theme/Icon/Icon';
import { flattenToAppURL, isInternalURL } from '@plone/volto/helpers/Url/Url';
import config from '@plone/volto/registry';

import backSVG from '@plone/volto/icons/back.svg';
import folderSVG from '@plone/volto/icons/folder.svg';
import clearSVG from '@plone/volto/icons/clear.svg';
import searchSVG from '@plone/volto/icons/zoom.svg';
import linkSVG from '@plone/volto/icons/link.svg';
import homeSVG from '@plone/volto/icons/home.svg';
import iconsSVG from '@plone/volto/icons/apps.svg';
import listSVG from '@plone/volto/icons/list-bullet.svg';

import ObjectBrowserNav from '@plone/volto/components/manage/Sidebar/ObjectBrowserNav';

const messages = defineMessages({
  SearchInputPlaceholder: {
    id: 'Search content',
    defaultMessage: 'Search content',
  },
  SelectedItems: {
    id: 'Selected items',
    defaultMessage: 'Selected items',
  },
  back: {
    id: 'Back',
    defaultMessage: 'Back',
  },
  search: {
    id: 'Search SVG',
    defaultMessage: 'Search SVG',
  },
  iconView: {
    id: 'Icon View',
    defaultMessage: 'Icon View',
  },
  listView: {
    id: 'List View',
    defaultMessage: 'List View',
  },
  home: {
    id: 'Home',
    defaultMessage: 'Home',
  },
  of: { id: 'Selected items - x of y', defaultMessage: 'of' },
});

function getParentURL(url) {
  return flattenToAppURL(`${join(url.split('/').slice(0, -1), '/')}`) || '/';
}

class ObjectBrowserBody extends Component {
  static propTypes = {
    block: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
    data: PropTypes.any.isRequired,
    searchSubrequests: PropTypes.objectOf(PropTypes.any).isRequired,
    searchContent: PropTypes.func.isRequired,
    closeObjectBrowser: PropTypes.func.isRequired,
    onChangeBlock: PropTypes.func.isRequired,
    onSelectItem: PropTypes.func,
    dataName: PropTypes.string,
    maximumSelectionSize: PropTypes.number,
    contextURL: PropTypes.string,
    searchableTypes: PropTypes.arrayOf(PropTypes.string),
  };

  static defaultProps = {
    image: '',
    href: '',
    onSelectItem: null,
    dataName: null,
    selectableTypes: [],
    searchableTypes: null,
    maximumSelectionSize: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      currentFolder:
        this.props.mode === 'multiple' ? '/' : this.props.contextURL || '/',
      currentImageFolder:
        this.props.mode === 'multiple'
          ? '/'
          : this.props.mode === 'image' && this.props.data?.url
            ? getParentURL(this.props.data.url)
            : '/',
      currentLinkFolder:
        this.props.mode === 'multiple'
          ? '/'
          : this.props.mode === 'link' && this.props.data?.href
            ? getParentURL(this.props.data.href)
            : '/',
      parentFolder: '',
      selectedImage:
        this.props.mode === 'multiple'
          ? ''
          : this.props.mode === 'image' && this.props.data?.url
            ? flattenToAppURL(this.props.data.url)
            : '',
      selectedHref:
        this.props.mode === 'multiple'
          ? ''
          : this.props.mode === 'link' && this.props.data?.href
            ? flattenToAppURL(this.props.data.href)
            : '',
      showSearchInput: false,
      searchableTypes:
        this.props.mode === 'image'
          ? this.props.searchableTypes || config.settings.imageObjects
          : this.props.searchableTypes,
      view: this.props.mode === 'image' ? 'icons' : 'list',
    };
    this.searchInputRef = React.createRef();
  }

  componentDidMount() {
    this.initialSearch(this.props.mode);
  }

  initialSearch = (mode) => {
    const currentSelected =
      mode === 'multiple'
        ? ''
        : mode === 'image'
          ? this.state.selectedImage
          : this.state.selectedHref;
    if (currentSelected && isInternalURL(currentSelected)) {
      this.props.searchContent(
        getParentURL(currentSelected),
        {
          'path.depth': 1,
          sort_on: 'getObjPositionInParent',
          metadata_fields: '_all',
          b_size: 1000,
        },
        `${this.props.block}-${mode}`,
      );
    } else {
      this.props.searchContent(
        this.state.currentFolder,
        {
          'path.depth': 1,
          sort_on: 'getObjPositionInParent',
          metadata_fields: '_all',
          b_size: 1000,
        },
        `${this.props.block}-${mode}`,
      );
    }
  };

  navigateTo = (id) => {
    this.props.searchContent(
      id,
      {
        'path.depth': 1,
        sort_on: 'getObjPositionInParent',
        metadata_fields: '_all',
        b_size: 1000,
      },
      `${this.props.block}-${this.props.mode}`,
    );
    const parent = `${join(id.split('/').slice(0, -1), '/')}` || '/';
    this.setState(() => ({
      parentFolder: parent,
      currentFolder: id || '/',
    }));
  };

  toggleSearchInput = () =>
    this.setState(
      (prevState) => ({
        showSearchInput: !prevState.showSearchInput,
      }),
      () => {
        if (this.searchInputRef?.current) {
          this.searchInputRef.current.focus();
        } else {
          this.props.searchContent(
            this.state.currentFolder,
            {
              'path.depth': 1,
              sort_on: 'getObjPositionInParent',
              metadata_fields: '_all',
              b_size: 1000,
            },
            `${this.props.block}-${this.props.mode}`,
          );
        }
      },
    );

  toggleView = () =>
    this.setState((prevState) => ({
      view: prevState.view === 'icons' ? 'list' : 'icons',
    }));

  onSearch = (e) => {
    const text = flattenToAppURL(e.target.value);
    if (text.startsWith('/')) {
      this.setState({ currentFolder: text });
      this.props.searchContent(
        text,
        {
          'path.depth': 1,
          sort_on: 'getObjPositionInParent',
          metadata_fields: '_all',
          portal_type: this.state.searchableTypes,
        },
        `${this.props.block}-${this.props.mode}`,
      );
    } else {
      text.length > 2
        ? this.props.searchContent(
            '/',
            {
              SearchableText: `${text}*`,
              metadata_fields: '_all',
              portal_type: this.state.searchableTypes,
            },
            `${this.props.block}-${this.props.mode}`,
          )
        : this.props.searchContent(
            '/',
            {
              'path.depth': 1,
              sort_on: 'getObjPositionInParent',
              metadata_fields: '_all',
              portal_type: this.state.searchableTypes,
            },
            `${this.props.block}-${this.props.mode}`,
          );
    }
  };

  onSelectItem = (item) => {
    const url = item['@id'];
    const { block, data, mode, dataName, onChangeBlock } = this.props;

    const updateState = (mode) => {
      switch (mode) {
        case 'image':
          this.setState({
            selectedImage: url,
            currentImageFolder: getParentURL(url),
          });
          break;
        case 'link':
          this.setState({
            selectedHref: url,
            currentLinkFolder: getParentURL(url),
          });
          break;
        default:
          break;
      }
    };

    if (dataName) {
      onChangeBlock(block, {
        ...data,
        [dataName]: url,
      });
    } else if (this.props.onSelectItem) {
      this.props.onSelectItem(url, item);
    } else if (mode === 'image') {
      onChangeBlock(block, {
        ...data,
        url: flattenToAppURL(item.getURL),
        alt: '',
      });
    } else if (mode === 'link') {
      onChangeBlock(block, {
        ...data,
        href: flattenToAppURL(url),
      });
    }
    updateState(mode);
  };

  onChangeBlockData = (key, value) => {
    this.props.onChangeBlock(this.props.block, {
      ...this.props.data,
      [key]: value,
    });
  };

  isSelectable = (item) => {
    const { maximumSelectionSize, data, mode, selectableTypes } = this.props;
    if (
      maximumSelectionSize &&
      data &&
      mode === 'multiple' &&
      maximumSelectionSize <= data.length
    )
      return data.some(
        (d) => flattenToAppURL(d['@id']) === flattenToAppURL(item['@id']),
      );
    return selectableTypes.length > 0
      ? selectableTypes.indexOf(item['@type']) >= 0
      : true;
  };

  /**
   * New: explicit selection handler — ALWAYS selects, never navigates.
   * Called from radio/checkbox controls in ObjectBrowserNav.
   */
  handleSelectItem = (item) => {
    const { mode, maximumSelectionSize, data } = this.props;

    if (mode === 'multiple') {
      // Toggle selection in multiple mode
      const isDeselecting =
        Array.isArray(data) &&
        data.some(
          (d) => flattenToAppURL(d['@id']) === flattenToAppURL(item['@id']),
        );
      this.onSelectItem(item);
      const length = data ? data.length : 0;
      const newLength = isDeselecting ? length - 1 : length + 1;
      if (
        maximumSelectionSize > 0 &&
        newLength >= maximumSelectionSize
      ) {
        this.props.closeObjectBrowser();
      }
    } else {
      // Single-select (link, image): select and close
      this.onSelectItem(item);
      this.props.closeObjectBrowser();
    }
  };

  /**
   * Simplified: clicking a row.
   * - Folderish items → ALWAYS navigate (all modes)
   * - Non-folderish items → select if selectable
   */
  handleClickOnItem = (item) => {
    if (item.is_folderish) {
      this.navigateTo(item['@id']);
    } else {
      // Non-folderish: select if selectable
      if (this.props.mode === 'image') {
        if (config.settings.imageObjects.includes(item['@type'])) {
          this.handleSelectItem(item);
        }
      } else if (this.isSelectable(item)) {
        this.handleSelectItem(item);
      }
    }
  };

  render() {
    return (
      <Segment.Group raised className="object-browser">
        <header className="header pulled">
          <div className="vertical divider" />
          {this.state.showSearchInput ? (
            <Input
              className="search"
              ref={this.searchInputRef}
              onChange={this.onSearch}
              placeholder={this.props.intl.formatMessage(
                messages.SearchInputPlaceholder,
              )}
            />
          ) : (
            <>
              {this.state.currentFolder === '/' ? (
                <>
                  {this.props.mode === 'image' ? (
                    <Icon name={folderSVG} size="24px" />
                  ) : (
                    <Icon name={linkSVG} size="24px" />
                  )}
                </>
              ) : (
                <button
                  aria-label={this.props.intl.formatMessage(messages.back)}
                  onClick={() => this.navigateTo(this.state.parentFolder)}
                >
                  <Icon name={backSVG} size="24px" />
                </button>
              )}
              {this.props.mode === 'image' ? (
                <h2>
                  <FormattedMessage
                    id="Choose Image"
                    defaultMessage="Choose Image"
                  />
                </h2>
              ) : (
                <h2>
                  <FormattedMessage
                    id="Choose Target"
                    defaultMessage="Choose Target"
                  />
                </h2>
              )}
            </>
          )}

          <button
            aria-label={this.props.intl.formatMessage(messages.search)}
            onClick={this.toggleSearchInput}
          >
            <Icon name={searchSVG} size="24px" />
          </button>
          <button className="clearSVG" onClick={this.props.closeObjectBrowser}>
            <Icon name={clearSVG} size="24px" />
          </button>
        </header>
        <Segment secondary className="breadcrumbs" vertical>
          {this.props.mode === 'image' && (
            <button
              onClick={this.toggleView}
              className="mode-switch"
              aria-label={this.props.intl.formatMessage(
                this.state.view === 'list'
                  ? messages.iconView
                  : messages.listView,
              )}
            >
              <Icon
                name={this.state.view === 'list' ? iconsSVG : listSVG}
                size="24px"
                className="mode-switch"
                title={this.props.intl.formatMessage(
                  this.state.view === 'list'
                    ? messages.iconView
                    : messages.listView,
                )}
              />
            </button>
          )}
          {!this.state.showSearchInput ? (
            <Breadcrumb>
              {this.state.currentFolder !== '/' ? (
                this.state.currentFolder
                  .split('/')
                  .map((item, index, items) => {
                    return (
                      <React.Fragment key={`divider-${item}-${index}`}>
                        {index === 0 ? (
                          <Breadcrumb.Section
                            onClick={() => this.navigateTo('/')}
                            role="button"
                            aria-label={this.props.intl.formatMessage(
                              messages.home,
                            )}
                          >
                            <Icon
                              className="home-icon"
                              name={homeSVG}
                              size="18px"
                              title={this.props.intl.formatMessage(
                                messages.home,
                              )}
                            />
                          </Breadcrumb.Section>
                        ) : (
                          <>
                            <Breadcrumb.Divider key={`divider-${item.url}`} />
                            <Breadcrumb.Section
                              role="button"
                              onClick={() =>
                                this.navigateTo(
                                  items.slice(0, index + 1).join('/'),
                                )
                              }
                            >
                              {item}
                            </Breadcrumb.Section>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })
              ) : (
                <Breadcrumb.Section
                  onClick={() => this.navigateTo('/')}
                  aria-label={this.props.intl.formatMessage(messages.home)}
                >
                  <Icon
                    className="home-icon"
                    name={homeSVG}
                    role="button"
                    size="18px"
                    title={this.props.intl.formatMessage(messages.home)}
                  />
                </Breadcrumb.Section>
              )}
            </Breadcrumb>
          ) : (
            <div className="searchResults">
              <FormattedMessage
                id="Search results"
                defaultMessage="Search results"
              />
            </div>
          )}
        </Segment>
        {this.props.mode === 'multiple' && (
          <Segment className="infos">
            {this.props.intl.formatMessage(messages.SelectedItems)}:{' '}
            {this.props.data?.length}
            {this.props.maximumSelectionSize > 0 && (
              <>
                {' '}
                {this.props.intl.formatMessage(messages.of)}{' '}
                {this.props.maximumSelectionSize}
              </>
            )}
          </Segment>
        )}
        <ObjectBrowserNav
          currentSearchResults={
            this.props.searchSubrequests[
              `${this.props.block}-${this.props.mode}`
            ]
          }
          selected={
            this.props.mode === 'multiple'
              ? this.props.data
              : [
                  {
                    '@id':
                      this.props.mode === 'image'
                        ? this.state.selectedImage
                        : this.state.selectedHref,
                  },
                ]
          }
          handleClickOnItem={this.handleClickOnItem}
          handleSelectItem={this.handleSelectItem}
          mode={this.props.mode}
          view={this.state.view}
          navigateTo={this.navigateTo}
          isSelectable={this.isSelectable}
        />
      </Segment.Group>
    );
  }
}

export default compose(
  injectIntl,
  connect(
    (state) => ({
      searchSubrequests: state.search.subrequests,
      lang: state.intl.locale,
    }),
    { searchContent },
  ),
)(ObjectBrowserBody);
