import React, { Component } from 'react';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import logo from './logo.svg';
import './App.css';

const initialValue = Value.fromJSON({
  document: {
    nodes: [
      {
        object: 'block',
        type: 'paragraph',
        nodes: [
          {
            object: 'text',
            leaves: [
              {
                text: 'A line of text in a paragraph.',
              },
            ],
          },
        ],
      },
    ],
  },
})

function renderEditor(props) {
  const { children, editor } = props
  const wordCount = "count:111";//countWords(editor.value.text)
  return (
    <div>
      {children}
      <span className="word-count">{wordCount}</span>
    </div>
  )
}

function CodeNode(props) {
  return (
    <pre {...props.attributes}>
      <code>{props.children}</code>
    </pre>
  )
}

function BoldMark(props) {
  return <strong>{props.children}</strong>
}

class App extends Component {
  // Set the initial value when the app is first constructed.
  state = {
    value: initialValue,
  }

  // On change, update the app's React state with the new editor value.
  onChange = ({ value }) => {
    this.setState({ value })
  }

  onKeyDown = (event, change) => {
    if (!event.ctrlKey) {
      return;
    }
    switch (event.key) {
      case 'b': {
        event.preventDefault()
        change.toggleMark('bold')
        return true
      }
      case '`': {
        const isCode = change.value.blocks.some(block => block.type == 'code')
        event.preventDefault()
        change.setBlocks(isCode ? 'paragraph' : 'code')
        return true
      }
    }
  }

  render() {
    // return <Editor value={this.state.value} onChange={this.onChange} />
    return (
      <Editor
        value={this.state.value}
        onChange={this.onChange}
        onKeyDown={this.onKeyDown}
        renderNode={this.renderNode}
        // Add the `renderMark` prop...
        renderMark={this.renderMark}
        renderEditor={renderEditor}
      />
    )
  }

  renderNode = props => {
    switch (props.node.type) {
      case 'code':
        return <CodeNode {...props} />
    }
  }

  // Add a `renderMark` method to render marks.
  renderMark = props => {
    switch (props.mark.type) {
      case 'bold':
        return <BoldMark {...props} />
    }
  }
}

export default App;
