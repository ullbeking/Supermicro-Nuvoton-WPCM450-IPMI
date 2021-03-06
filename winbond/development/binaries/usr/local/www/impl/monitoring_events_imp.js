var isIE = ((navigator.appName.indexOf('Microsoft')>=0)?true:false);

var eventLogTable=null;
var tblJSON;
var g_isadmin = 0;
/* [Linda] fixed the issue of utcoffset*/
//var rpc_ntp;

function doInit()
{

	exposeElms(['_eventTypeSel',
				'_eventLogHolder',
				'_clearLog',
				'_utcOffset',
				'_eventLogCount']);

	var eventtype_str = [
						eLang.getString('common',"STR_APP_STR_197a"),
						eLang.getString('common',"STR_APP_STR_195"),
						eLang.getString('common',"STR_APP_STR_196"),
						eLang.getString('common',"STR_APP_STR_197")];
 				
 	vhref=top.document.getElementsByTagName('frameset')[1];
	vcolsa=vhref.cols.split(",");
 	
 	loadCustomPageElements();
 	
 	optind = 0;
	for (i=0; i < eventtype_str.length; i++)
		eventTypeSel.add(new Option(eventtype_str[i],i),isIE?optind++:null);

	CheckRole();
}

function loadCustomPageElements()
{
	 //Initialize ListGrid	 
	 /* eventLogTable = domapi.Listgrid({
	  x				  : 0,
	  y				  : 0,
	  w				  : (parseInt(document.body.clientWidth)-20), //+parseInt(vcolsa[2])),
	  h				  : (parseInt(document.body.clientHeight)-187),
	  headerH		  : 25,
	  doLedgerMode    : false,
	  doColMove       : false,
	  doColSort       : true,
	  doDepress       : false,
	  gridlines       : "both",
	  doAllowEdit     : false,
	  doColResize     : true,
	  linesPerRow     : 2,
	  minColWidth     : 20,
	  doShowHeader    : true,
	  doShowRowbar    : false,
	  doMultiSelect   : false,
	  doVirtualMode   : false,
	  doAllowNoSelect : true,
	  doShowSelection : false 
	});


	eventLogTable.style.position = 'relative';
	eventLogTable.style.width = (parseInt(document.body.scrollWidth)-20), //+parseInt(top.helpFrame.document.body.offsetWidth))+'px';
	
	eventLogTable.style.background = 'transparent';
	*/
	
	eventLogTable = listgrid({
		w				: '100%',
		h				: '195px',
		doAllowNoSelect : true
	});

	//add the list grid to the body division
	eventLogHolder.appendChild(eventLogTable.table);
	
/* If there is a listgrid embed in the page,
** please don't use resize event directly
** Use only via lGrid.onpageresize event 
*/
	eventLogTable.onpageresize = function()
	{
		this.table.style.width = '100%';
		this.table.style.width = this.container.header.offsetWidth+'px';
	}
	
	tblJSON = {
				cols:[
				{text:eLang.getString('common',"STR_APP_STR_190"), fieldName:'event_id', fieldType:2, w:"7%"},
				{text:eLang.getString('common',"STR_APP_STR_191"), fieldName:'timestamp', w:"18%"},
				{text:eLang.getString('common',"STR_APP_STR_192"), fieldName:'sensorname', w:"21%"},
				{text:eLang.getString('common',"STR_APP_STR_193"), fieldName:'sensortype', w:"15%"},
				{text:eLang.getString('common',"STR_APP_STR_194"), fieldName:'description', w:"35%"}
				]
				};
	
	eventLogTable.loadFromJson(tblJSON);

}


function CheckRole()
{
	xmit.get({url:'/rpc/getrole.asp', onrcv:OnCheckRole, status:''});
}


function OnCheckRole()
{
	if(WEBVAR_JSONVAR_GET_ROLE.WEBVAR_STRUCTNAME_GET_ROLE[0]['CURPRIV'] != 4)
	{
		g_isadmin = 0;
		//alert(eLang.getString('common',"STR_APP_STR_184"));
		clearLog.disabled = true;
	}
	else
	{
		g_isadmin = 1;
		clearLog.disabled = false;
	}
	doInit2();
}


function doInit2()
{
	eventTypeSel.onchange = comborefresh;
	clearLog.onclick = ClearSel;
 	IPMICMD_HL_GetSELInfo();
}


function IPMICMD_HL_GetSELInfo()
{
	showWait(true);
	//xmit.get({url:"/rpc/getntpcfg.asp",onrcv:respNTPcfg,status:''});
	xmit.get({url:"/rpc/getallselentries.asp",onrcv:IPMICMD_GetSEL_Res,status:'',status:''});
}

/*
function respNTPcfg()
{
	rpc_ntp = WEBVAR_JSONVAR_GETNTPCFG.WEBVAR_STRUCTNAME_GETNTPCFG[0];
	if (rpc_ntp.UTC_OFFSET > 0)
		utcOffset.innerHTML = "+" + rpc_ntp.UTC_OFFSET;
	else
		utcOffset.innerHTML = rpc_ntp.UTC_OFFSET;
}
*/

function IPMICMD_GetSEL_Res(arg)
{
	var CmdStatus = WEBVAR_JSONVAR_HL_GETALLSELENTRIES.HAPI_STATUS;
	if (CmdStatus == 0)
	{
		SELINFO_DATA = WEBVAR_JSONVAR_HL_GETALLSELENTRIES.WEBVAR_STRUCTNAME_HL_GETALLSELENTRIES;
		if (!SELINFO_DATA.length)
			{
			alert(eLang.getString('common',"NO_SEL_STRING"));
			//return;
			}
		RefreshEvents();
	}
	else
	{
		errstr = eLang.getString('common',"STR_MONIT_EVENTLOG");
		errstr +=  (eLang.getString('common','STR_IPMI_ERROR') + GET_ERROR_CODE(CmdStatus));
		alert(errstr);
	}
}


function RefreshEvents()
{
	var count = 0;
	var str;
	var type;
	var offset;
	var timestamp;
	var JSONRows = new Array();
	var m_Max_allowed_offset= new Array();
	var m_Max_allowed_SensorSpecific_offset =new Array();

	// Please refer the spec . This array contain max allowed offet for particular generic Event /Reading Type for 0x1 to 0x0c
	m_Max_allowed_offset[0] = 0x0;
	m_Max_allowed_offset[1] = 0x0b;
	m_Max_allowed_offset[2] = 0x3;
	m_Max_allowed_offset[3] =0x2;
	m_Max_allowed_offset[4] =0x2;
	m_Max_allowed_offset[5] =0x2;
	m_Max_allowed_offset[6] =0x2;
	m_Max_allowed_offset[7] =0x8;
	m_Max_allowed_offset[8] =0x2;
	m_Max_allowed_offset[9] =0x2;
	m_Max_allowed_offset[10] =0x8;
	m_Max_allowed_offset[11] =0x7;
	m_Max_allowed_offset[12] = 0x3;



// Please refer the spec . This array contain max allowed offet for particular generic Event /Reading Type for 0x6f
	m_Max_allowed_SensorSpecific_offset[5]= 6;
	m_Max_allowed_SensorSpecific_offset[6]= 5;
	m_Max_allowed_SensorSpecific_offset[7]= 10;
	m_Max_allowed_SensorSpecific_offset[8]= 6;
	m_Max_allowed_SensorSpecific_offset[9]= 7;
	m_Max_allowed_SensorSpecific_offset[12]= 8;
	m_Max_allowed_SensorSpecific_offset[15]= 2;
	m_Max_allowed_SensorSpecific_offset[16]= 5;
	m_Max_allowed_SensorSpecific_offset[17]= 7;
	m_Max_allowed_SensorSpecific_offset[18]= 5;
	m_Max_allowed_SensorSpecific_offset[19]= 10;
	m_Max_allowed_SensorSpecific_offset[20]= 4;
	m_Max_allowed_SensorSpecific_offset[25]= 0;
	m_Max_allowed_SensorSpecific_offset[29]= 4;
	m_Max_allowed_SensorSpecific_offset[30]= 4;
	m_Max_allowed_SensorSpecific_offset[31]= 6;
	m_Max_allowed_SensorSpecific_offset[32]= 1;
	m_Max_allowed_SensorSpecific_offset[33]= 9 ;
	m_Max_allowed_SensorSpecific_offset[34]= 13;
	m_Max_allowed_SensorSpecific_offset[35]= 8;
	m_Max_allowed_SensorSpecific_offset[36]= 3;
	m_Max_allowed_SensorSpecific_offset[37]= 2;
	m_Max_allowed_SensorSpecific_offset[39]= 1;
	m_Max_allowed_SensorSpecific_offset[40]=3 ;
	m_Max_allowed_SensorSpecific_offset[41]=2 ;
	m_Max_allowed_SensorSpecific_offset[42]= 1;
	m_Max_allowed_SensorSpecific_offset[43]= 7 ;
	m_Max_allowed_SensorSpecific_offset[44]= 7 ;
	
	eventLogTable.clear();
	

	for (j=0;j<SELINFO_DATA.length;j++)
		{

		/* Check GeneratorID */
		//sensor specific events
		if (  ((getbits(SELINFO_DATA[j].GenID1,0,0) == 0x00) &&
		(1 == eventTypeSel.value)) ||

				//bios generated events
		(( (SELINFO_DATA[j].GenID1 >= 0x01) &&	(SELINFO_DATA[j].GenID1 <= 0x1F)) &&
		(2 == eventTypeSel.value)) ||

				//system software generated events
		(( (SELINFO_DATA[j].GenID1 >= 0x41) &&	(SELINFO_DATA[j].GenID1 <= 0x6F)) &&
		(3 == eventTypeSel.value)) ||

		//All Events
		(0 == eventTypeSel.value) )
			{
			type = getbits(SELINFO_DATA[j].EventDirType,6,0);

			// If event type is 0x6F then read from sensor-specific table
			// else, read from event_strings table
			if ( type == 0)
				{
				/* Unspecified */
				}
			else if ( type == 0x6F )
				{

				// Sensor Specific event
				offset = getbits(SELINFO_DATA[j].EventData1,3,0);
				if(m_Max_allowed_SensorSpecific_offset[SELINFO_DATA[j].SensorType] >= offset)
					{
						str = eLang.getString('sensor_specific_event',SELINFO_DATA[j].SensorType,offset);
					}
				else
					{
						str =eLang.getString("common","INVALID_OFFSET");	

					}
				}
			else if (( type >= 0x01) && ( type <= 0x0C))
				{
				offset = getbits(SELINFO_DATA[j].EventData1,3,0);

				if(m_Max_allowed_offset[type]  >= offset)
					{
						str = eLang.getString('event',type,offset);
					}else
					{
						str =eLang.getString("common","INVALID_OFFSET");	
					}
				}
			else if (type == 0x70) {  // [Farida] added
				str = "Overheat";
			}	
			else
				{
				/* specific */
				}

			//if it is a BIOS  Post event then
			if ( (SELINFO_DATA[j].GenID1 >= 0x01) && (SELINFO_DATA[j].GenID1 <= 0x1F) 
				&& ( SELINFO_DATA[j].SensorType == 0xf) )
				{
				//look up bios_post_String using offset and evtdata2
				//we are clean..event data 2 should be seen only if this bits indicate evtdata2 has something

				//Only 0 and 1 table are in Bios_post_event_str.js  //
				if (getbits(SELINFO_DATA[j].EventData1,7,6) == 0xC0  &&( (offset >=0 ) && (offset <= 2)))
					{
						/* Since SensorType 0xf ,Offset 1 and 2 use the same table Entry  */
						if(2 == offset) offset =1;
					str += "-" + eLang.getString('bios_post_event',offset,getbits(SELINFO_DATA[j].EventData2,3,0));
					}
				else
					{
					str += "-" + eLang.getString('common',"STR_APP_STR_185");
					}
				}


			if (getbits(SELINFO_DATA[j].EventDirType,7,7) == 0)
				str += " - "+eLang.getString('common',"STR_APP_STR_186");
			else
				str += " - "+eLang.getString('common',"STR_APP_STR_187");


			//var utcoffset = rpc_ntp.UTC_OFFSET;
			var ts = SELINFO_DATA[j].TimeStamp;
			//var ts = ((((Val & 0xff) << 24)+((Val & 0xff00) << 8)+((Val & 0xff0000) >> 8) +((Val & 0xff000000) >> 24)));
			//ts = (ts + (utcoffset * 60 * 60));		//Converting utcOffset from Hours to seconds.

			var EvtDate = new Date(ts*1000);
			var disp_month=EvtDate.getUTCMonth()+1;
			disp_month =((disp_month < 10)?"0":"") + disp_month;
			var disp_date = EvtDate.getUTCDate();
			disp_date=((disp_date < 10)?"0":"") + disp_date;
			timestamp = disp_month+'/'+disp_date+'/'+EvtDate.getUTCFullYear();
			var disp_hours =EvtDate.getUTCHours();
			disp_hours =((disp_hours < 10)?"0":"") + disp_hours;
			var disp_mins = EvtDate.getUTCMinutes();
			disp_mins =((disp_mins < 10)?"0":"") + disp_mins;
			var disp_secs = EvtDate.getUTCSeconds();
			disp_secs =((disp_secs < 10)?"0":"") + disp_secs;
			timestamp += '  '+disp_hours+':'+disp_mins+':'+disp_secs;


			JSONRows.push({cells:[
							{text:parseInt(SELINFO_DATA[j].RecordID), value:parseInt(SELINFO_DATA[j].RecordID)},
							{text:timestamp, value:timestamp},
							{text:SELINFO_DATA[j].SensorName, value:SELINFO_DATA[j].SensorName},
							{text:eLang.getString('sensortype',SELINFO_DATA[j].SensorType), value:eLang.getString('sensortype',SELINFO_DATA[j].SensorType)},
							{text:str, value:str}
							]})
			count++;
			}
		}

	tblJSON.rows = JSONRows;
	eventLogTable.loadFromJson(tblJSON);
	
	eventLogCount.innerHTML = count+eLang.getString('common',"STR_APP_STR_189");
	showWait(false);
}


function comborefresh()
{
	showWait(true, eLang.getString('common',"STR_SORTING"));
	setTimeout("RefreshEvents()",1000);
}


function IPMICMD_ClearSEL_Res()
{
	alert(eLang.getString('common',"STR_APP_STR_198"));
	IPMICMD_HL_GetSELInfo();
}

function ClearSel()
{
	if (g_isadmin)
	{
		if (confirm(eLang.getString('common',"STR_APP_STR_199")))
		{
			RPC_ClearSEL = new xmit.getset({url:"/rpc/clearsel.asp",onrcv:IPMICMD_ClearSEL_Res,status:'',timeout:60});
			RPC_ClearSEL.send();
		}
		else
		{
			return;
		}
	}
	else
		alert(eLang.getString('common',"STR_APP_STR_184"));
}
