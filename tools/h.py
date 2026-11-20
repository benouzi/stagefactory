import os, re, sys, json, base64, zipfile, io
from playwright.sync_api import sync_playwright
APP='/home/claude/app'; NM='/home/claude/npmx/node_modules'; OUT='/home/claude/shots'; os.makedirs(OUT, exist_ok=True)
CT={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.wasm':'application/wasm'}
def route(r):
    u=r.request.url
    m=re.match(r'https://cdn\.jsdelivr\.net/npm/((?:@[\w\-]+/)?[\w\-]+)@[^/]+/(.*)',u)
    if m: return r.fulfill(path=os.path.join(NM,m.group(1),m.group(2)),content_type='application/wasm' if u.endswith('.wasm') else 'application/javascript',headers={'Access-Control-Allow-Origin':'*'})
    if u.startswith('https://fonts.'): return r.fulfill(body='',content_type='text/css')
    if u.startswith('http://app/'):
        f=os.path.join(APP,u[len('http://app/'):].split('?')[0] or 'index.html')
        return r.fulfill(path=f,content_type=CT.get(os.path.splitext(f)[1],'text/plain'))
    return r.abort()
def open_app(p, w=900, h=560, quality='basse'):
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pg=b.new_page(viewport={'width':w,'height':h}); errs=[]
    pg.on('console',lambda m: m.type in ('error',) and errs.append(m.text)); pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
    pg.route('**/*',route); pg.set_default_timeout(240000); pg.goto('http://app/index.html'+('' if os.environ.get('SF_BLANK') else '?demo'))
    pg.wait_for_function("window.STAGE && document.querySelector('#loader').style.display==='none'",timeout=240000)
    pg.evaluate(f"(()=>{{const e=document.querySelector('#qual');e.value='{quality}';e.dispatchEvent(new Event('change'))}})()")
    return b,pg,errs
def gdtf_bytes():
    xml='''<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="TestSpot" LongName="Test Spot 700" Manufacturer="Acme" FixtureTypeID="AAAA-1111">
<AttributeDefinitions/><PhysicalDescriptions><Properties><Weight Value="21.5"/><PowerConsumption Value="700"/></Properties></PhysicalDescriptions>
<Geometries><Geometry Name="Base"><Axis Name="Yoke"><Axis Name="Head"><Beam Name="Beam" BeamAngle="20" LuminousFlux="16000" PowerConsumption="700"/></Axis></Axis></Geometry></Geometries>
<DMXModes><DMXMode Name="Basic" Geometry="Base"><DMXChannels>
<DMXChannel Offset="1,2" Geometry="Yoke"><LogicalChannel Attribute="Pan"><ChannelFunction Attribute="Pan" PhysicalFrom="-270" PhysicalTo="270"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="3,4" Geometry="Head"><LogicalChannel Attribute="Tilt"><ChannelFunction Attribute="Tilt" PhysicalFrom="-125" PhysicalTo="125"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="5" Geometry="Beam"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="6" Geometry="Beam"><LogicalChannel Attribute="Zoom"><ChannelFunction Attribute="Zoom" PhysicalFrom="6" PhysicalTo="48"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="7" Geometry="Beam"><LogicalChannel Attribute="ColorSub_C"><ChannelFunction Attribute="ColorSub_C"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="18" Geometry="Beam"><LogicalChannel Attribute="Gobo1"><ChannelFunction Attribute="Gobo1"/></LogicalChannel></DMXChannel>
</DMXChannels></DMXMode><DMXMode Name="Extended" Geometry="Base"><DMXChannels><DMXChannel Offset="30" Geometry="Beam"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer"/></LogicalChannel></DMXChannel></DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>'''
    bio=io.BytesIO()
    with zipfile.ZipFile(bio,'w',zipfile.ZIP_DEFLATED) as z: z.writestr('description.xml',xml)
    return bio.getvalue()
