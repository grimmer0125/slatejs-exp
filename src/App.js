import React, { Component } from 'react';
import ReactDOM from 'react-dom'
import styled from 'react-emotion'
import { isKeyHotkey } from 'is-hotkey'

import { Value, Range } from 'slate'
import { Editor, findDOMRange, findRange } from 'slate-react'

import socketIOClient from 'socket.io-client'

import initialValue from './value.json'
import { Button, Icon, Toolbar, Menu } from './components'
// import './App.css';

/**
 * Give the menu some styles.
 *
 * @type {Component}
 */

const StyledMenu = styled(Menu)`
  padding: 8px 7px 6px;
  position: absolute;
  z-index: 1;
  top: -10000px;
  left: -10000px;
  margin-top: -6px;
  opacity: 0;
  background-color: #222;
  border-radius: 4px;
  transition: opacity 0.75s;
`

const Wrapper = styled('div')`
  max-width: 42em;
  margin: 0 auto 20px;
  padding: 20px;
`

const Example = styled(Wrapper)`
  background: #fff;
`

/**
 * The hovering cursor.
 *
 * @type {Component}
 */

class HoverCursor extends React.Component {
  /**
   * Render.
   *
   * @return {Element}
   */

  render() {
    const { className, innerRef } = this.props
    const root = window.document.getElementById('root')

    return ReactDOM.createPortal(
      <StyledMenu className={className} innerRef={innerRef}>
        <div style={{ color: 'white' }}>{this.props.name}</div>
        {/* {this.renderMarkButton('bold', 'format_bold')}
        {this.renderMarkButton('italic', 'format_italic')}
        {this.renderMarkButton('underlined', 'format_underlined')}
        {this.renderMarkButton('code', 'code')} */}
      </StyledMenu>,
      root
    )
  }
}

/**
 * A spacer component.
 *
 * @type {Component}
 */

const Spacer = styled('div')`
  height: 20px;
  background-color: #eee;
  margin: 20px -20px;
`

/**
 * Hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey('mod+b')
const isItalicHotkey = isKeyHotkey('mod+i')
const isUnderlinedHotkey = isKeyHotkey('mod+u')
const isCodeHotkey = isKeyHotkey('mod+`')

/**
 * A simple editor component to demo syncing with socket.io.
 *
 * @type {Component}
 */

class SyncingEditor extends React.Component {
  constructor(props) {
    super(props)

    // TODO: save remoteSession list instead to show multiple remote Cursors
    this.state = {
      sessionID: '',
      remoteSession: '',
      value: Value.fromJSON(initialValue),
    }

    console.log('try to use socket server')
    const socket = socketIOClient('http://localhost:3001')
    this.socket = socket

    socket.on('connect', () => {
      console.log('clientid:', socket.id)

      this.sessionID = socket.id
    })

    socket.on('cursor', data => {
      console.log('get broadcast cursor range;', data)

      if (data.action === 'update') {
        this.setState({ remoteSession: data.session })

        const remoteRange = Range.fromJSON(data.range)
        this.updateMenu(remoteRange)
      }
    })
  }

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */

  hasMark = type => {
    const { value } = this.state
    return value.activeMarks.some(mark => mark.type == type)
  }

  /**
   * On update, update the menu.
   */

  componentDidMount = () => {
    this.updateMenu()
  }

  componentDidUpdate = () => {
    this.updateMenu()
  }

  broadcastCursorRange = range => {
    // console.log('this.socket:', this.socket)

    if (this.socket) {
      this.socket.emit('cursor', {
        session: this.sessionID,
        action: 'update',
        range,
      })
    }
  }

  updateMenu = remoteRange => {
    const { value } = this.state
    const menu = this.menu

    if (!menu) {
      return
    }

    // console.log('value:', value)

    if (!value.isFocused && !remoteRange) {
      // menu.removeAttribute('style')
      // console.log('not show')
      return
    }

    let slateRange

    if (remoteRange) {
      console.log('remote changes cursor')
      slateRange = remoteRange

      const range = findDOMRange(slateRange)

      const rect = range.getBoundingClientRect()
      console.log('rect:', rect)
      menu.style.opacity = 1
      menu.style.top = `${rect.top + window.pageYOffset - menu.offsetHeight}px`

      menu.style.left = `${rect.left + window.pageXOffset}px`
      // menu.style.left = `${rect.left +
      //   window.pageXOffset -
      //   menu.offsetWidth / 2 +
      //   rect.width / 2}px`
    } else {
      console.log('local changes cursor')

      const selection = window.getSelection()
      const nativeRange = selection.getRangeAt(0)
      console.log('native range:', nativeRange)

      slateRange = findRange(nativeRange, value)
      const jsonStr = slateRange.toJSON()
      slateRange = Range.fromJSON(jsonStr)
      console.log('slate range:', slateRange)

      this.broadcastCursorRange(slateRange.toJSON())
    }
  }

  /**
   * Render.
   *
   * @return {Element}
   */

  render() {
    return (
      <div>
        <Toolbar>
          {this.renderMarkButton('bold', 'format_bold')}
          {this.renderMarkButton('italic', 'format_italic')}
          {this.renderMarkButton('underlined', 'format_underlined')}
          {this.renderMarkButton('code', 'code')}
        </Toolbar>
        <HoverCursor
          innerRef={menu => (this.menu = menu)}
          value={this.state.value}
          onChange={this.onChange}
          name={this.state.remoteSession}
        />
        <Editor
          placeholder="Enter some text..."
          value={this.state.value}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          renderMark={this.renderMark}
          spellCheck
        />
      </div>
    )
  }

  /**
   * Render a mark-toggling toolbar button.
   *
   * @param {String} type
   * @param {String} icon
   * @return {Element}
   */

  renderMarkButton = (type, icon) => {
    return (
      <Button
        active={this.hasMark(type)}
        onMouseDown={event => this.onClickMark(event, type)}
      >
        <Icon>{icon}</Icon>
      </Button>
    )
  }

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderMark = props => {
    const { children, mark, attributes } = props

    switch (mark.type) {
      case 'bold':
        return <strong {...attributes}>{children}</strong>
      case 'code':
        return <code {...attributes}>{children}</code>
      case 'italic':
        return <em {...attributes}>{children}</em>
      case 'underlined':
        return <u {...attributes}>{children}</u>
    }
  }

  /**
   * On change, save the new `value`. And if it's a local change, call the
   * passed-in `onChange` handler.
   *
   * @param {Change} change
   * @param {Object} options
   */

  onChange = (change, options = {}) => {
    console.log('onchange!!')
    this.setState({ value: change.value })

    if (!options.remote) {
      console.log('onchange, active, notify remote to change!!')

      // this.props.onChange(change)
    }
  }

  /**
   * On key down, if it's a formatting command toggle a mark.
   *
   * @param {Event} event
   * @param {Change} change
   * @return {Change}
   */

  onKeyDown = (event, change) => {
    let mark

    if (isBoldHotkey(event)) {
      mark = 'bold'
    } else if (isItalicHotkey(event)) {
      mark = 'italic'
    } else if (isUnderlinedHotkey(event)) {
      mark = 'underlined'
    } else if (isCodeHotkey(event)) {
      mark = 'code'
    } else {
      return
    }

    event.preventDefault()
    change.toggleMark(mark)
    return true
  }

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} event
   * @param {String} type
   */

  onClickMark = (event, type) => {
    event.preventDefault()
    const { value } = this.state
    const change = value.change().toggleMark(type)
    this.onChange(change)
  }
}

/**
 * The syncing operations example.
 *
 * @type {Component}
 */

class App extends React.Component {
  /**
   * Render syncingEditor.
   *
   * @return {Element}
   */

  render() {
    return (
      <Example>
        <SyncingEditor
        />
      </Example>
    )
  }
}

/**
 * Export.
 */

export default App
