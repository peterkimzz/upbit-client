import axios, { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosResponse } from 'axios'
import jwt from 'jsonwebtoken'
import qs from 'querystring'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

interface UpbitTokenParams {
  access_key: string
  nonce: string
  query_hash?: string
  query_hash_alg?: 'SHA512'
}

export interface UpbitAccount {
  currency: string 
  balance: string 
  locked: string 
  avg_buy_price: string 
  avg_buy_price_medofied: boolean 
  unit_currency: string
}

export interface UpbitMarketCode {
  market: string
  korean_name: string
  english_name: string
}
export interface UpbitWalletStatus {
  currency: string
  wallet_state: string
  block_state: string
  block_height: number
  block_updated_at: string
  block_elapsed_minutes: number
}

export interface UpbitDepositsCoinAddress {
  currency: string
  deposit_address: string
  secondary_address?: string
}

export interface UpbitOrder {
  uuid: string
  side: string
  ord_type: string
  price: string
  state: string
  market: string
  created_at: string
  volume: string
  remaining_volume: string
  reserved_fee: string
  remaining_fee: string
  paid_fee: string
  locked: string
  executed_volume: string
  trades_count: number
}
export interface UpbitOrderChance {
  bid_fee: string
  ask_fee: string
  maker_bid_fee: string
  maker_ask_fee: string
  market: {
    id: string
    name: string
    order_types: string[]
    order_sides: string[]
    bid: {
      currency: string
      price_unit?: string
      min_total: number
    }
    ask: {
      currency: string
      price_unit?: string
      min_total: number
    }
  }
  bid_account: {
    currency: string
    balance: string
    locked: string
    avg_buy_price: string
    avg_buy_price_modified: boolean
    unit_currency: string
  }
  ask_account: {
    currency: string
    balance: string
    locked: string
    avg_buy_price: string
    avg_buy_price_modified: boolean
    unit_currency: string
  }
}

export class Upbit {
  private readonly access_key: string
  private readonly secret_key: string
  private http: AxiosInstance

  constructor(auth: { access_key: string, secret_key: string }) {
    this.access_key = auth.access_key
    this.secret_key = auth.secret_key
    
    this.http = axios.create({ baseURL: 'https://api.upbit.com' })
    this.http.interceptors.request.use((value: AxiosRequestConfig) => {

      if (value.data) {
        value.headers['Authorization'] = `Bearer ${this.GenerateToken(value.data)}`
      }
      else {
        value.headers['Authorization'] = `Bearer ${this.GenerateToken()}`
      }

      console.log(`\n[HTTP Request information]`)
      console.log(`${value.method?.toUpperCase()} ${value.baseURL}${value.url}`)
      if (value.data) {
        console.log(value.data)
      }

      return value
    })
    this.http.interceptors.response.use((value: AxiosResponse) => {
      if (value.status < 400) {
        console.log(`\n[HTTP Response information] ${value.status}`)
        console.log(value.data)

        return value.data
      }

      return value
    })
  }

  private GenerateToken(data?: { [key: string]: any }): string {
    const payload: UpbitTokenParams = {
      access_key: this.access_key,
      nonce: uuidv4(),
    }

    if (data) {
      const query = qs.encode(data)
      const queryHash = crypto.createHash('sha512').update(query, 'utf-8').digest('hex')

      payload.query_hash = queryHash
      payload.query_hash_alg = 'SHA512'
    }

    return jwt.sign(payload, this.secret_key)
  }

  /**
   * @description API 키 리스트 조회 - API 키 목록 및 만료 일자를 조회합니다.
   * @example
   * const upbit = new Upbit({ ... })
   * const keys = await upbit.GetApiKeys()
   * 
   */
  GetApiKeys(): Promise<{ access_key: string, expire_at: string }[]> {
    return this.http.get('/v1/api_keys')
  }

  /**
   * @description 입출금 현황 - 입출금 현황 및 블록 상태를 조회합니다.
   * @example
   * const upbit = new Upbit({ ... })
   * const wallets = await upbit.GetStatusWallet()
   * [
       {
         currency: 'BTC', 화폐를 의미하는 영문 대문자 코드
         wallet_state: 'working', 입출금 상태
         block_state: 'normal', 블록 상태
         block_height: 665700, block_height	블록 높이	Integer
         block_updated_at: '2021-01-01T09:00:00.000+00:00', block_updated_at	블록 갱신 시각
         block_elapsed_minutes: 20
       }
     ]
     입출금 상태
     - working : 입출금 가능
     - withdraw_only : 출금만 가능
     - deposit_only : 입금만 가능
     - paused : 입출금 중단
     - unsupported : 입출금 미지원
 
     블록 상태
     - normal : 정상
     - delayed : 지연
     - inactive : 비활성 (점검 등)
   */
  GetStatusWallet(): Promise<UpbitWalletStatus[]> {
    return this.http.get('/v1/status/wallet')
  }
  
  /**
   * @description 전체 입금 주소 조회 - 내가 보유한 자산 리스트를 보여줍니다.
   * @example
   * const upbit = new Upbit({ ... })
   * const addresses = await upbit.GetDepositsCoinAddresses()
   * const address = await upbit.GetDepositsCoinAddresses({ currency: 'BTC' })
   * 
   */
  GetDepositsCoinAddresses(data?: { currency: string }): Promise<UpbitDepositsCoinAddress[]> {
    return this.http.get('/v1/deposits/coin_addresses?' + qs.stringify(data), { data })
  }

  /**
   * @description 전체 계좌 조회 - 내가 보유한 자산 리스트를 보여줍니다.
   * @example
   * const upbit = new Upbit({ ... })
   * const accounts = await upbit.GetAccounts()
   * 
   * currency - 화폐를 의미하는 영문 대문자 코드
   * 
     balance - 주문가능 금액/수량

     locked - 주문 중 묶여있는 금액/수량

     avg_buy_price - 매수평균가

     avg_buy_price_modified - 매수평균가 수정 여부

     unit_currency - 평단가 기준 화폐
   */
  public GetAccounts(): Promise<UpbitAccount[]> {
    return this.http.get('/v1/accounts')
  }

  /**
  * @description 업비트에서 거래 가능한 마켓 목록
  * @example 
  * const upbit = new Upbit({ ... })
  * const accounts = await upbit.GetMarketCode()
  * [
  *   { 
  *     market: 'KRW-BTC', 
  *     korean_name: '비트코인', 
  *     english_name: 'Bitcoin'
  *   }
  * ]
  * 
  * market - 업비트에서 제공중인 시장 정보
  * 
  * korean_name - 거래 대상 암호화폐 한글명
  * 
  * english_name - 거래 대상 암호화폐 영문명
  */
  public GetMarketCode(): Promise<UpbitMarketCode[]> { 
    return this.http.get('/v1/market/all')
  }

  /**
   * @description 주문하기
   * const upbit = new Upbit({ ... })
   * const order = await upbit.Order({ market: 'KRW-BTC', side: 'ask', volume: '0.01', price: '100, ord_type: 'limit' })
   * 
   */
  public Order(data: { market: string, side: 'bid' | 'ask', volume: string, price?: string, ord_type: 'limit' | 'price' | 'market' }): Promise<UpbitOrder> {
    return this.http.post('/v1/orders', { data })
  }

  /** @description 매도 가능 여부
   *  @example
   *  const upbit = new Upbit({ ... })
   *  const chance = await upbit.GetOrderChance({ market: 'KRW-BTC' })
   * 
   * 
   *  bid_fee	매수 수수료 비율	NumberString
      ask_fee	매도 수수료 비율	NumberString
      market	마켓에 대한 정보	Object
      market.id	마켓의 유일 키	String
      market.name	마켓 이름	String
      market.order_types	지원 주문 방식	Array[String]
      market.order_sides	지원 주문 종류	Array[String]
      market.bid	매수 시 제약사항	Object
      market.bid.currency	화폐를 의미하는 영문 대문자 코드	String
      market.bit.price_unit	주문금액 단위	String
      market.bid.min_total	최소 매도/매수 금액	Number
      market.ask	매도 시 제약사항	Object
      market.ask.currency	화폐를 의미하는 영문 대문자 코드	String
      market.ask.price_unit	주문금액 단위	String
      market.ask.min_total	최소 매도/매수 금액	Number
      market.max_total	최대 매도/매수 금액	NumberString
      market.state	마켓 운영 상태	String
      bid_account	매수 시 사용하는 화폐의 계좌 상태	Object
      bid_account.currency	화폐를 의미하는 영문 대문자 코드	String
      bid_account.balance	주문가능 금액/수량	NumberString
      bid_account.locked	주문 중 묶여있는 금액/수량	NumberString
      bid_account.avg_buy_price	매수평균가	NumberString
      bid_account.avg_buy_price_modified	매수평균가 수정 여부	Boolean
      bid_account.unit_currency	평단가 기준 화폐	String
      ask_account	매도 시 사용하는 화폐의 계좌 상태	Object
      ask_account.currency	화폐를 의미하는 영문 대문자 코드	String
      ask_account.balance	주문가능 금액/수량	NumberString
      ask_account.locked	주문 중 묶여있는 금액/수량	NumberString
      ask_account.avg_buy_price	매수평균가	NumberString
      ask_account.avg_buy_price_modified	매수평균가 수정 여부	Boolean
      ask_account.unit_currency	평단가 기준 화폐	String
   */
  public GetOrderChance(data: { market: string }): Promise<UpbitOrderChance> {
    return this.http.get('/v1/orders/chance?' + qs.stringify(data), { data })
  }

  public GetCandle(data: { market: string, unit?: number | string, to?: string, count?: number | string }) {
    const unit = data.unit || 1

    const payload: { [key: string]: any } = {
      market: data.market,
      count: data.count || 1
    }
    if (data.unit) {
      switch (data.unit) {
        case 1:
        case 3:
        case 5:
        case 10:
        case 30:
        case 60:
        case 240:
          break
        default:
          throw new Error('Invalid unit.')
      }
    }
    if (data.count) {
      if (data.count > 200) {
        throw new Error('Invalid count.')
      }
    }
    if (data.to) [
      payload.to = data.to
    ]

    return this.http.get(`/v1/candles/minutes/${unit}?${qs.stringify(payload)}`)
  }
}