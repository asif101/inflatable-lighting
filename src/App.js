
import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Slider from '@material-ui/core/Slider'
import { SketchPicker } from 'react-color'
import './App.css'

let socket = null

function App() {

  const [brightness, setBrightness] = useState(50)
  const [color, setColor] = useState('#30cc71')
  const [tab, setTab] = useState(0)

  useEffect(() => {
    socket = io(`http://${window.location.hostname}:3001`)
    socket.on('connect', () => console.log('Connected to Server!'))
  }, [])

  return (
    <div className="App">
      <AppBar position="static" className='AppBar'>
        <Toolbar>
          <Typography variant="h6">
            Inflatable LED Control
          </Typography>
        </Toolbar>
      </AppBar>
      <div style={{ display: 'flex' }}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={tab}
          onChange={(e, v) => setTab(v)}
        >

          <Tab className='Tab' label="General" id={`tab-${0}`} />
          <Tab className='Tab' label="Item Two" id={`tab-${1}`} />
          <Tab className='Tab' label="Item Three" id={`tab-${2}`} />
          <Tab className='Tab' label="Item Four" id={`tab-${3}`} />
        </Tabs>
        <TabPanel value={tab} index={0}>
          <div style={{ width: '50%' }}>
            <Slider
              valueLabelDisplay="auto"
              value={brightness}
              onChange={(e, v) => {
                if (v !== brightness) {
                  setBrightness(v)
                  socket.emit('setBrightness', v)
                }
              }}
            />
            <SketchPicker
              disableAlpha={true}
              color={color}
              onChangeComplete={color => {
                setColor(color.hex)
                socket.emit('setSolidColor', color.hex)
              }}
            />
          </div>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          Item Two
        </TabPanel>
        <TabPanel value={tab} index={2}>
          Item Three
        </TabPanel>
        <TabPanel value={tab} index={3}>
          Item Four
        </TabPanel>
      </div>
    </div>
  )
}

export default App


function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <div>{children}</div>
      )}
    </div>
  );
}


