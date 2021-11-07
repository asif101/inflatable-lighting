
import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Slider from '@material-ui/core/Slider'
import MenuItem from '@material-ui/core/MenuItem'
import Select from '@material-ui/core/Select'
import InputLabel from '@material-ui/core/InputLabel'
import { SketchPicker } from 'react-color'
import './App.css'

let socket = null

function App() {

  const [brightness, setBrightness] = useState(50)
  const [solidColor, setSolidColor] = useState('#30cc71')
  const [pattern, setPattern] = useState('none')
  const [patternNames, setPatternNames] = useState([])
  const [tab, setTab] = useState(0)
  const [stripType, setStripType] = useState()
  const [stripTypes, setStripTypes] = useState({})
  const [numLeds, setNumLeds] = useState(60)
  const [whiteChannel, setWhiteChannel] = useState(0)
  const [recordingFileNames, setRecordingFileNames] = useState([])
  const [recordingThatIsPlaying, setRecordingThatIsPlaying] = useState('')
  const [playMode, setPlayMode] = useState()
  const [temperature, setTemperature] = useState()
  const [pixelData, setPixelData] = useState(Array(300).fill(0))

  useEffect(() => {
    const port = process.env.NODE_ENV === 'production' ? 3000 : 3001
    socket = io(`http://${window.location.hostname}:${port}`)
    socket.on('connect', () => {
      socket.emit('joinReactRoom', null, success => {
        if (success) console.log('Connected to Server!')
      })
      socket.emit('getData', null, ({ brightness, currentPatternName, currentSolidColor, patternNames, stripType, stripTypes, numLeds, recordingFileNames, playMode }) => {
        setBrightness(brightness)
        setPattern(currentPatternName)
        if (currentSolidColor) setSolidColor(currentSolidColor)
        setPatternNames(patternNames)
        setStripTypes(stripTypes)
        setStripType(stripType)
        setNumLeds(numLeds)
        setRecordingFileNames(recordingFileNames)
        setPlayMode(playMode)
      })
    })
    socket.on('recordings', recordingFileNames => setRecordingFileNames(recordingFileNames))
    socket.on('playMode', mode => setPlayMode(mode))
    socket.on('temp', t => setTemperature(t))
    socket.on('pixelData', d => {
      // console.log(d)
      // console.log(d[0].toString(16))
      setPixelData(d)
    })
  }, [])

  return (
    <div className="App">
      <AppBar position="static" className='AppBar'>
        <Toolbar>
          <Typography variant="h6">
            Inflatable LED Control
          </Typography>
          <Typography>
            Current Mode: {playMode}
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
          <Tab className='Tab' label="Pixel Preview" id={`tab-${4}`} />
        </Tabs>
        <TabPanel className={'TabPanel'} value={tab} index={0}>
          {stripType && <>
            <div>
              <div className='general-settings'>
                {temperature && <Typography variant="h6">
                  Controller Temperature: {temperature} °C
                </Typography>}
                <div>
                  <InputLabel>Strip Type</InputLabel>
                  <Select
                    variant='outlined'
                    value={stripType}
                    onChange={e => {
                      setStripType(e.target.value)
                      socket.emit('setStripType', e.target.value)
                    }}
                  >
                    {Object.keys(stripTypes).map(x => <MenuItem key={x} value={stripTypes[x]}>{x}</MenuItem>)}
                  </Select>
                </div>
              </div>
            </div>
          </>}
          <div>
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
          </div>
          <div>
            <Typography>Number of LEDs</Typography>
            <Slider
              valueLabelDisplay="auto"
              value={numLeds}
              min={0}
              max={600}
              marks={[0, 300, 600].map(x => ({ value: x, label: x }))}
              onChange={(e, v) => setNumLeds(v)}
              onChangeCommitted={(e, v) => {
                setNumLeds(v)
                socket.emit('setNumLeds', v)
              }}
            />
          </div>
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={1}>
          <SketchPicker
            disableAlpha={true}
            color={solidColor}
            onChangeComplete={color => {
              setSolidColor(color.hex)
              socket.emit('setSolidColor', whiteChannel > 0 ? addWhiteChannelToHex(color.hex, whiteChannel) : color.hex)
            }}
          />
          <Typography>White Channel</Typography>
          <Slider
            valueLabelDisplay="auto"
            value={whiteChannel}
            min={0}
            max={255}
            marks={[0, 255].map(x => ({ value: x, label: x }))}
            onChange={(e, v) => setWhiteChannel(v)}
            onChangeCommitted={(e, v) => {
              setWhiteChannel(v)
              socket.emit('setSolidColor', v > 0 ? addWhiteChannelToHex(solidColor, v) : solidColor)
            }}
          />
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={2}>
          <div>
            <InputLabel>Pattern</InputLabel>
            <Select
              variant='outlined'
              value={pattern}
              onChange={e => {
                setPattern(e.target.value)
                socket.emit('setPattern', e.target.value)
              }}
            >
              <MenuItem value={'none'}>None</MenuItem>
              {patternNames.map(x => <MenuItem key={x} value={x}>{camelToHumanCase(x)}</MenuItem>)}
            </Select>
          </div>
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={3}>
          <div>
            <InputLabel>Recording</InputLabel>
            <Select
              variant='outlined'
              value={recordingThatIsPlaying}
              onChange={e => {
                setRecordingThatIsPlaying(e.target.value)
                socket.emit('playRecording', e.target.value)
              }}
            >
              {recordingFileNames.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
            </Select>
          </div>
        </TabPanel>
        <TabPanel className={'TabPanel'} value={tab} index={4}>
          <Typography>Pixel Preview</Typography>
          <div className='pixel-preview-container'>
            {pixelData.map((d, i) => <div key={i} className='pixel-preview' style={{ backgroundColor: '#' + d.toString(16) }} />)}
          </div>
        </TabPanel>
      </div>
    </div >
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

function camelToHumanCase(text) {
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function addWhiteChannelToHex(hex, whiteChannelInt) {
  return '#' + whiteChannelInt.toString(16) + hex.split('#')[1]
}