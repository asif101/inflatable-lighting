
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
    const port = process.env.NODE_ENV === 'production' ? 3000 : 3001
    socket = io(`http://${window.location.hostname}:${port}`)
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

          <Tab className='Tab' label="General Settings" id={`tab-${0}`} />
          <Tab className='Tab' label="Solid Color" id={`tab-${1}`} />
          <Tab className='Tab' label="Pattern" id={`tab-${2}`} />
          <Tab className='Tab' label="Replay System" id={`tab-${3}`} />
        </Tabs>
        <TabPanel className={'TabPanel'} value={tab} index={0}>
          <Typography>Brightness</Typography>
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
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={1}>
          <SketchPicker
            disableAlpha={true}
            color={color}
            onChangeComplete={color => {
              setColor(color.hex)
              socket.emit('setSolidColor', color.hex)
            }}
          />
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={2}>
          Item Three
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={3}>
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


