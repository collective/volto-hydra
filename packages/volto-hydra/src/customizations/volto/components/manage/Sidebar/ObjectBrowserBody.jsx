import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import { Input, Segment, Breadcrumb } from 'semantic-ui-react';

import join from 'lodash/join';

// These absolute imports (without using the corresponding centralized index.js) are required
// to cut circular import problems, this file should never use them. This is because of
// the very nature of the functionality of the component and its relationship with others
import loadable from '@loadable/component';
import { readAsDataURL } from 'promise-file-reader';
import { searchContent } from '@plone/volto/actions/search/search';
import { getContent, createContent } from '@plone/volto/actions/content/content';
import { validateFileUploadSize } from '@plone/volto/helpers/FormValidation/FormValidation';
import { collectAnchorsFromContent, collectAnchorsFromStore } from '../../../../../utils/linkableAnchors';
import { buildUploadPayload } from '../../../../../utils/uploadPayload';
import Icon from '@plone/volto/components/theme/Icon/Icon';
import { flattenToAppURL, isInternalURL } from '@plone/volto/helpers/Url/Url';
import config from '@plone/volto/registry';

const Dropzone = loadable(() => import('react-dropzone'));

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
  upload: { id: 'Upload', defaultMessage: 'Upload' },
  uploadingFile: { id: 'Uploading…', defaultMessage: 'Uploading…' },
});

function getParentURL(url) {
  return flattenToAppURL(`${join(url.split('/').slice(0, -1), '/')}`) || '/';
}

/**
 * ObjectBrowserBody container class.
 * @class ObjectBrowserBody
 * @extends Component
 */
class ObjectBrowserBody extends Component {
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
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
    initialPath: PropTypes.string,
    contextURL: PropTypes.string,
    searchableTypes: PropTypes.arrayOf(PropTypes.string),
    onlyFolderishSelectable: PropTypes.bool,
  };

  /**
   * Default properties.
   * @property {Object} defaultProps Default properties.
   * @static
   */
  static defaultProps = {
    image: '',
    href: '',
    onSelectItem: null,
    dataName: null,
    selectableTypes: [],
    searchableTypes: null,
    maximumSelectionSize: null,
    onlyFolderishSelectable: false,
  };

  /**
   * Constructor
   * @method constructor
   * @param {Object} props Component properties
   * @constructs WysiwygEditor
   */
  constructor(props) {
    super(props);
    const defaultMultiplePath = props.initialPath || '/';
    this.state = {
      currentFolder:
        this.props.mode === 'multiple'
          ? defaultMultiplePath
          : this.props.contextURL || '/',
      currentImageFolder:
        this.props.mode === 'multiple'
          ? defaultMultiplePath
          : this.props.mode === 'image' && this.props.data?.url
            ? getParentURL(this.props.data.url)
            : '/',
      currentLinkFolder:
        this.props.mode === 'multiple'
          ? defaultMultiplePath
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
      // In image mode, the searchable types default to the image types which
      // can be overridden with the property if specified.
      // If selectableTypes are passed, the searchableTypes are the selectableTypes
      searchableTypes:
        this.props.mode === 'image'
          ? this.props.searchableTypes || config.settings.imageObjects
          : [
              ...(this.props.searchableTypes ?? []),
              ...(this.props.selectableTypes ?? []),
            ],
      view: this.props.mode === 'image' ? 'icons' : 'list',
      // Deep-link anchors: which item's anchors are expanded, and a cache of
      // the anchors fetched per item (keyed by flattened @id).
      expandedAnchorsFor: null,
      anchorsByItem: {},
      // Upload-into-folder state.
      uploading: false,
    };
    this.searchInputRef = React.createRef();
    this.uploadInputRef = React.createRef();
  }

  /**
   * Component did mount
   * @method componentDidMount
   * @returns {undefined}
   */
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

  // Re-run the search that populates the current folder listing.
  refreshListing = () => {
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
  };

  // Upload a file into the folder being browsed, then auto-select it. image/*
  // becomes an Image, anything else a File (see buildUploadPayload). Reuses the
  // image-widget upload mechanism (readAsDataURL + createContent).
  handleUpload = (file) => {
    if (!file) return;
    if (!validateFileUploadSize(file, this.props.intl.formatMessage)) return;
    this.setState({ uploading: true });
    readAsDataURL(file).then((dataUrl) => {
      const payload = buildUploadPayload(file, dataUrl);
      this.props
        .createContent(
          this.state.currentFolder,
          payload,
          `${this.props.block}-ob-upload`,
        )
        .then((created) => {
          this.setState({ uploading: false });
          if (!created) return;
          this.refreshListing();
          // Auto-select via the normal path: select+close (link/image) or add
          // to the selection (multiple).
          this.handleSelectItem(created);
        })
        .catch(() => this.setState({ uploading: false }));
    });
  };

  // Toggle the deep-link anchor list for an item. On first expand, fetch the
  // FULL object (search metadata carries no blocks) and collect its anchors in
  // document order.
  onToggleAnchors = async (item) => {
    const id = flattenToAppURL(item['@id']);
    if (this.state.expandedAnchorsFor === id) {
      this.setState({ expandedAnchorsFor: null });
      return;
    }
    if (!this.state.anchorsByItem[id]) {
      // The page currently being edited → LIVE anchors from the transient store
      // (state.linkableAnchors), ordered against the current form's block layout,
      // so a just-added heading is linkable without saving. Any other page → the
      // persisted content via getContent (whose dispatched promise resolves with
      // the full body, blocks included — see Teaser/Data.jsx).
      const editingPath = this.props.pathname
        ? this.props.pathname.replace(/\/(edit|add)$/, '')
        : null;
      const isCurrentPage =
        editingPath &&
        flattenToAppURL(editingPath) === id &&
        this.props.formData &&
        this.props.formData.blocks;
      let anchors;
      if (isCurrentPage) {
        anchors = collectAnchorsFromStore(
          this.props.formData,
          this.props.linkableAnchors || {},
          config.blocks.blocksConfig,
          this.props.intl,
        );
      } else {
        const resp = await this.props.getContent(id, null, `anchors-${id}`);
        anchors = resp
          ? collectAnchorsFromContent(
              resp,
              config.blocks.blocksConfig,
              this.props.intl,
            )
          : [];
      }
      this.setState((s) => ({
        anchorsByItem: { ...s.anchorsByItem, [id]: anchors },
      }));
    }
    this.setState({ expandedAnchorsFor: id });
  };

  // Pick a fragment: reuse the normal select path with `#id` appended so every
  // link surface (sidebar widget, canvas editor) stores the deep link.
  onSelectAnchor = (item, anchor) => {
    this.onSelectItem({ ...item, '@id': `${item['@id']}#${anchor.id}` });
  };

  isSelectable = (item) => {
    const {
      maximumSelectionSize,
      data,
      mode,
      selectableTypes,
      onlyFolderishSelectable,
    } = this.props;

    if (onlyFolderishSelectable && !item.is_folderish) {
      return false;
    }
    if (
      maximumSelectionSize &&
      data &&
      mode === 'multiple' &&
      maximumSelectionSize <= data.length
    )
      // The item should actually be selectable, but only for removing it from already selected items list.
      // handleClickOnItem will handle the deselection logic.
      // The item is not selectable if we reached/exceeded maximumSelectionSize and is not already selected.
      return data.some(
        (d) => flattenToAppURL(d['@id']) === flattenToAppURL(item['@id']),
      );
    return selectableTypes.length > 0
      ? selectableTypes.indexOf(item['@type']) >= 0
      : true;
  };

  // HYDRA: explicit selection handler — ALWAYS selects, never navigates.
  // Wired into the radio/checkbox controls in ObjectBrowserNav so the user
  // can click a folder name to navigate into it AND independently select
  // the folder via its control (upstream couples these into one click).
  handleSelectItem = (item) => {
    const { mode, maximumSelectionSize, data } = this.props;

    if (mode === 'multiple') {
      const isDeselecting =
        Array.isArray(data) &&
        data.some(
          (d) => flattenToAppURL(d['@id']) === flattenToAppURL(item['@id']),
        );
      this.onSelectItem(item);
      const length = data ? data.length : 0;
      const newLength = isDeselecting ? length - 1 : length + 1;
      if (maximumSelectionSize > 0 && newLength >= maximumSelectionSize) {
        this.props.closeObjectBrowser();
      }
    } else {
      // Single-select (link, image): select and close.
      this.onSelectItem(item);
      this.props.closeObjectBrowser();
    }
  };

  // HYDRA: simplified row click.
  //   - Folderish items ALWAYS navigate (every mode), so the file tree
  //     stays navigable independent of selection state — upstream
  //     conditionally selects-or-navigates, which gets confusing when
  //     the folder itself is also selectable.
  //   - Non-folderish items fall through to handleSelectItem.
  // (Upstream handleDoubleClickOnItem is dropped — single-click is now
  // unambiguous and the double-click affordance isn't needed.)
  handleClickOnItem = (item) => {
    if (item.is_folderish) {
      this.navigateTo(item['@id']);
    } else if (this.props.mode === 'image') {
      if (config.settings.imageObjects.includes(item['@type'])) {
        this.handleSelectItem(item);
      }
    } else if (this.isSelectable(item)) {
      this.handleSelectItem(item);
    }
  };

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */
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
        <Dropzone
          noClick
          multiple={false}
          onDrop={(files) => files?.[0] && this.handleUpload(files[0])}
        >
          {({ getRootProps, getInputProps, open }) => (
            <div {...getRootProps()} className="ob-upload-dropzone">
              <Segment className="ob-upload-bar">
                <input {...getInputProps({ className: 'ob-upload-input' })} />
                <button
                  type="button"
                  className="ob-upload-button"
                  onClick={open}
                >
                  {this.state.uploading
                    ? this.props.intl.formatMessage(messages.uploadingFile)
                    : this.props.intl.formatMessage(messages.upload)}
                </button>
              </Segment>
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
          onToggleAnchors={this.onToggleAnchors}
          onSelectAnchor={this.onSelectAnchor}
          expandedAnchorsFor={this.state.expandedAnchorsFor}
          anchorsByItem={this.state.anchorsByItem}
              />
            </div>
          )}
        </Dropzone>
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
      // Live edit-form data (for the current page's block order) + the transient
      // anchor store + current path, so anchors for the page being edited come
      // from the store rather than persisted content.
      formData: state.form.global,
      linkableAnchors: state.linkableAnchors?.anchors,
      pathname: state.router?.location?.pathname,
    }),
    { searchContent, getContent, createContent },
  ),
)(ObjectBrowserBody);
