import 'jest'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

describe('IntervalTree', () => {
  let tree: IntervalTree

  const expectTree = (value: string) => {
    expect(tree.toString()).toBe(value)
  }

  beforeEach(() => {
    tree = new IntervalTree()
  })

  afterEach(function afterEach() {
    tree.verify()
  })

  it('Should be pass sanity', () => {
    expect(typeof IntervalTree).toBe('function')
  })

  it('Should be able to create new instance', () => {
    expect(typeof new IntervalTree()).toBe('object')
  })

  it('inserts interval', () => {
    tree.addInterval(1, 5)
    expectTree('IntervalTree([Interval(1, 5)])')
  })

  it('inserts unique datapoints', () => {
    tree.addInterval(0, 3)
    tree.addInterval(0, 3, 'a')
    tree.addInterval(0, 3, 'b')
    expect(tree.allIntervals.size).toBe(3)
  })

  it('merges overlapping intervals', () => {
    tree.addInterval(1, 5)
    tree.addInterval(5, 9)
    tree.addInterval(15, 19)
    tree.addInterval(19, 25)
    tree.mergeOverlaps()
    expectTree('IntervalTree([Interval(1, 9),Interval(15, 25)])')
  })

  it('merges overlapping intervals with data', () => {
    tree.addInterval(1, 5)
    tree.addInterval(5, 9)
    tree.addInterval(15, 19)
    tree.addInterval(19, 25, 'i')
    tree.mergeOverlaps()
    expectTree('IntervalTree([Interval(1, 9),Interval(15, 25)])')
  })

  it('can be an array', () => {
    tree.addInterval(1, 5, 'hello')
    expect(tree.toArray()).toEqual([[1, 5, 'hello']])
  })

  it('get first and last interval', () => {
    tree.addInterval(5, 10)
    tree.addInterval(0, 4)
    expect(tree.first()!.toString()).toBe('Interval(0, 4)')
    expect(tree.last()!.toString()).toBe('Interval(5, 10)')
  })

  it('chops tree', () => {
    tree.addInterval(0, 10)
    tree.chop(3, 7)
    expectTree('IntervalTree([Interval(0, 3),Interval(7, 10)])')
  })

  it('chopAll chops multiple', () => {
    tree.addInterval(0, 100)
    tree.chopAll([
      [3, 7],
      [50, 60],
    ])
    expectTree(
      'IntervalTree([Interval(0, 3),Interval(7, 50),Interval(60, 100)])'
    )
  })

  it('chops bigger things', () => {
    const allIntervals: Array<[number, number]> = [
      [1481157540000, 1481158800000],
      [1481216400000, 1481234400000],
      [1481239800000, 1481245200000],
      [1481302800000, 1481320800000],
      [1481326200000, 1481331600000],
      [1481389200000, 1481418000000],
      [1481475600000, 1481504400000],
      [1481562000000, 1481580000000],
      [1481585400000, 1481590800000],
      [1481648400000, 1481677200000],
      [1481734800000, 1481752800000],
      [1481758200000, 1481763600000],
      [1481821200000, 1481839200000],
      [1481844600000, 1481850000000],
      [1481907600000, 1481936400000],
      [1481994000000, 1482022800000],
      [1482080400000, 1482109200000],
      [1482166800000, 1482195600000],
      [1482253200000, 1482282000000],
      [1482253200000, 1483344000000],
    ]
    tree.initFromSimpleArray(allIntervals)
    tree.chop(1482220800000, 1482253200000)
  })

  it('chops in the past', () => {
    const allIntervals: Array<[number, number]> = [
      [227833200000, 227840400000],
      [227923200000, 227926800000],
      [227984400000, 228013200000],
      [228070800000, 228099600000],
      [228157200000, 228186000000],
      [228416400000, 228445200000],
      [228502800000, 228531600000],
      [228589200000, 228618000000],
      [228675600000, 228704400000],
      [228762000000, 228790800000],
      [229021200000, 229050000000],
    ]
    tree.initFromSimpleArray(allIntervals)
    tree.chop(0, 227923200000)
    expect(tree.first()!.start).toBe(227923200000)
  })

  it('find intervals of minimum length', () => {
    tree.addInterval(0, 1)
    tree.addInterval(2, 4)
    tree.addInterval(5, 8)
    tree.addInterval(9, 13)
    tree.addInterval(14, 19)
    expect(tree.searchByLengthStartingAt(3, 0).toString()).toBe(
      'Interval(5, 8),Interval(9, 13),Interval(14, 19)'
    )

    expect(tree.searchByLengthStartingAt(3, 9).toString()).toBe(
      'Interval(9, 13),Interval(14, 19)'
    )
  })

  it('clone empty', () => {
    expect(tree.clone().toString()).toBe(tree.toString())
  })

  it('clone', () => {
    tree.addInterval(0, 1)
    tree.addInterval(2, 4)
    tree.addInterval(5, 8)
    tree.addInterval(9, 13)
    expect(tree.clone().toString()).toBe(tree.toString())
  })

  it('cloned intervals are the same', () => {
    tree.addInterval(0, 1)
    tree.addInterval(2, 4)
    tree.addInterval(5, 8)
    tree.addInterval(9, 13)
    const cloned = tree.clone()
    expect(tree.allIntervals.toArray()[0]).toBe(
      cloned.allIntervals.toArray()[0]
    )
    cloned.verify()
  })

  // it('cloning is faster than before', () => {
  //   for (let i = 1; i < 100; i++) {
  //     tree.addInterval(i * 100, i * 200)
  //   }
  //   console.time('clone new')
  //   for (let i = 0; i <= 1000; i++) {
  //     tree.clone()
  //   }
  //   console.timeEnd('clone new')

  //   console.time('clone old')
  //   for (let i = 0; i <= 1000; i++) {
  //     new IntervalTree(tree.allIntervals.toArray())
  //   }
  //   console.timeEnd('clone old')
  // })

  it('search bugs', () => {
    tree.initFromSimpleArray([
      [1483315500000, 1483318800000, 'hb3u3ztHuvPttf7dD'],
      [1483387200000, 1483394400000, null],
      [1483399800000, 1483405200000, '56NL2yqQJMhZ4w4dD'],
      [1483462800000, 1483480800000, 'fK3PPyXJss2g4LKWi'],
      [1483486200000, 1483491600000, 'qXnxZZa5yjeEPtT4z'],
      [1483549200000, 1483567200000, 'FMrcgBLxHSnvdsxao'],
      [1483572600000, 1483578000000, 'p8SFaNDiYZDfweknu'],
      [1483635600000, 1483653600000, 'sTijSr5vv8547KopH'],
      [1483659000000, 1483664400000, 'o2BiALLdKb56getkD'],
      [1483722000000, 1483740000000, 'BQxTPexLBK9S7e5JQ'],
      [1483745400000, 1483750800000, 'BsnAJnyLqCx8MzNqe'],
      [1483808400000, 1483837200000, 'PauxpTjuhZYpWfpu4'],
      [1483894800000, 1483923600000, 'v9jid69q9jjneSmFW'],
      [1483981200000, 1483999200000, 'M8G8wBXzqzCxX8yFh'],
      [1484004600000, 1484010000000, 'KD5Cb3Cu2ZBGJ9r6g'],
      [1484067600000, 1484085600000, 'bRyNQepujF78AAFCF'],
      [1484091000000, 1484096400000, '4uAJHFrSfQDoeJEZH'],
      [1484154000000, 1484172000000, 'ZNNrQEdmsdEnJe6zc'],
      [1484177400000, 1484182800000, 'CaaugipzJX3sXB4wP'],
      [1484240400000, 1484258400000, 'Zb9z5vKiGZ6BSC5pX'],
      [1484263800000, 1484269200000, 'MbSdt5N4XMTJ88uGt'],
      [1484326800000, 1484344800000, 'ib7YL6tSt5ZWPd8rL'],
      [1484350200000, 1484355600000, 'jCNZXuX8hrNnWvZpS'],
      [1484413200000, 1484442000000, 'null'],
    ])
    expect(
      tree.searchByLengthStartingAt(3600000, 1483315556345).toString()
    ).toBe(
      'Interval(1483387200000, 1483394400000),Interval(1483399800000, 1483405200000, 56NL2yqQJMhZ4w4dD),Interval(1483462800000, 1483480800000, fK3PPyXJss2g4LKWi),Interval(1483486200000, 1483491600000, qXnxZZa5yjeEPtT4z),Interval(1483549200000, 1483567200000, FMrcgBLxHSnvdsxao),Interval(1483572600000, 1483578000000, p8SFaNDiYZDfweknu),Interval(1483635600000, 1483653600000, sTijSr5vv8547KopH),Interval(1483659000000, 1483664400000, o2BiALLdKb56getkD),Interval(1483722000000, 1483740000000, BQxTPexLBK9S7e5JQ),Interval(1483745400000, 1483750800000, BsnAJnyLqCx8MzNqe),Interval(1483808400000, 1483837200000, PauxpTjuhZYpWfpu4),Interval(1483894800000, 1483923600000, v9jid69q9jjneSmFW),Interval(1483981200000, 1483999200000, M8G8wBXzqzCxX8yFh),Interval(1484004600000, 1484010000000, KD5Cb3Cu2ZBGJ9r6g),Interval(1484067600000, 1484085600000, bRyNQepujF78AAFCF),Interval(1484091000000, 1484096400000, 4uAJHFrSfQDoeJEZH),Interval(1484154000000, 1484172000000, ZNNrQEdmsdEnJe6zc),Interval(1484177400000, 1484182800000, CaaugipzJX3sXB4wP),Interval(1484240400000, 1484258400000, Zb9z5vKiGZ6BSC5pX),Interval(1484263800000, 1484269200000, MbSdt5N4XMTJ88uGt),Interval(1484326800000, 1484344800000, ib7YL6tSt5ZWPd8rL),Interval(1484350200000, 1484355600000, jCNZXuX8hrNnWvZpS),Interval(1484413200000, 1484442000000, null)'
    )
  })

  it('chop bugs', () => {
    tree.initFromSimpleArray([
      [1406304000000, 1406332800000],
      [1406324425000, 1406328025000],
      [1406328025000, 1406335225000],
      [1406563200000, 1406592000000],
      [1406649600000, 1406678400000],
      [1406736000000, 1406764800000],
      [1406822400000, 1406851200000],
      [1406908800000, 1406937600000],
      [1407168000000, 1407196800000],
      [1407254400000, 1407283200000],
      [1407340800000, 1407369600000],
      [1407427200000, 1407456000000],
    ])
    tree.chop(1406271600000, 1406304000000)
    tree.chop(1406332800000, 1406358000000)
    tree.chop(1406358000000, 1406444400000)
    tree.chop(1406444400000, 1406530800000)
    tree.chop(1406530800000, 1406563200000)
    tree.chop(1406592000000, 1406617200000)
    tree.chop(1406617200000, 1406649600000)
    tree.chop(1406678400000, 1406703600000)
    tree.chop(1406703600000, 1406736000000)
    tree.chop(1406764800000, 1406790000000)
    tree.chop(1406790000000, 1406822400000)
    tree.chop(1406851200000, 1406876400000)
    tree.chop(1406876400000, 1406908800000)
    tree.chop(1406937600000, 1406962800000)
    tree.chop(1406962800000, 1407049200000)
    tree.chop(1407049200000, 1407135600000)
    tree.chop(1407135600000, 1407168000000)
    tree.chop(1407196800000, 1407222000000)
    tree.chop(1407222000000, 1407254400000)
  })

  it('FOC-209 removeEnveloped RangeError', () => {
    tree.initFromSimpleArray([
      [1496948100000, 1496948400000, 'PfcyAB6iRmDxbfGSF'],
      [1496948100000, 1496948400000],
    ])
    tree.removeEnveloped(0, 1496948400000)
  })

  it('verifies empty', () => {
    tree.verify()
  })

  it('verifies with content', () => {
    tree.initFromSimpleArray([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
    tree.verify()
  })

  it('JSON serialization', () => {
    tree.addInterval(1, 2, 'data')
    tree.addInterval(3, 4)
    const json = JSON.stringify(tree)
    const tree2 = IntervalTree.fromJSON(json)
    expect(tree.allIntervals.toArray()).toEqual(tree2.allIntervals.toArray())
  })

  it('hashing', () => {
    tree.addInterval(1, 2, 'data')
    tree.addInterval(3, 4)
    const tree2 = tree.clone()
    expect(tree.hash()).toBe(tree2.hash())
  })

  it('adding existing interval is a no-op', () => {
    tree.addInterval(1, 2)
    tree.addInterval(1, 2)
    tree.addInterval(1, 2)
    tree.addInterval(1, 2)
    tree.addInterval(1, 2)
    expect(tree.toArray()).toEqual([[1, 2, null]])
  })

  it('null data compares properly with undefined', () => {
    tree.initFromSimpleArray([[1562351400000, 1562354700000, null]])
    tree.addInterval(1562351400000, 1562354700000) // this triggerred an exception
    expect(
      tree.allIntervals.has(new Interval(1562351400000, 1562354700000))
    ).toBe(true)
  })

  it('inserts dont fail', () => {
    /**
     * we had a broken implementation in popGreatestChild
     * due to sorting with default comparator rather than using End first
     */
    for (const [start, end, data] of [
      [1562792400000, 1562796000000, 'K4E2oBZwkELiAjo9d'],
      [1562816700000, 1562823000000, 'QXJXCn86GczNEzuxz'],
      [1562851800000, 1562866800000, 'XpEcb3fP8MehSMs42'],
      [1562857200000, 1562858100000, 'hCj7wRkxMm4qGYDbj'],
      [1562880600000, 1562884200000, 'JBhBjk5aH9Biu4rLn'],
      [1562896800000, 1562902200000, 'E4BWjdnpZosv7RNbG'],
      [1562896800000, 1562902200000, 'kmK4c28mZA4qegrvW'],
      [1562903100000, 1562909400000, 'REz57QrLdSrt6R5RS'],
      [1562938200000, 1562955000000, 'mgaMjrb7aBMfSfGj4'],
      [1562941800000, 1562942700000, 'MZgXPmzz484TxJkjZ'],
      [1562954400000, 1562958000000, 'oZ86SrFhQopojLB8Y'],
      [1562961600000, 1562965200000, '9BupssckohjSLem8a'],
      [1562989500000, 1562995800000, '5S2i93BcKb9F5txtc'],
      [1563024600000, 1563040800000, 'RSeEGNKjrxG9ER7zb'],
      [1563030000000, 1563030900000, 'xwcyeiEMGxyvztW92'],
      [1563030000000, 1563033600000, 'YkT6ZQahvugGTYpdG'],
      [1563039000000, 1563044400000, 'pmGxwEbm63M44sk8Q'],
      [1563075900000, 1563082200000, 'qB8YKi75669n44Y3Q'],
      [1563111000000, 1563127200000, 'FSbtj6ae3vJGwPi3K'],
      [1563116400000, 1563117300000, 'TFn56WbKHikDHsGuD'],
      [1563162300000, 1563168600000, 'J7G5FQQjFrCpPJFA5'],
      [1563165000000, 1563166800000, 'Q5DPhm9LZQtz94PW6'],
      [1563202800000, 1563203700000, 'XYjvLASDuTdjtW75o'],
      [1563202800000, 1563227100000, 'DSnJ3kkf3ZTnWi5Mh'],
      [1563289200000, 1563290100000, '8TnH2e6De4qrr5mK5'],
      [1563375600000, 1563376500000, 'qwomBthCDnK6rvEAc'],
      [1563395400000, 1563400800000, 'Dzt3LEXCbo6fQHaGD'],
      [1563462000000, 1563462900000, '9yWBZdng8nnfcRjC8'],
      [1563510600000, 1563512400000, 'AKwMKjdx2FPtbLYrH'],
      [1563546600000, 1563547500000, 'yTFWJsBmoDnaa78WR'],
      [1563570000000, 1563598500000, 'dTZBNfgc95aiQH6Bd'],
      [1563597000000, 1563598800000, 'vS2cGDPc7WXYa27q6'],
      [1563629400000, 1563645600000, 'BqhtbaYYKSCoKW7mJ'],
      [1563634800000, 1563635700000, '44FZWZh89Y8PEACZu'],
      [1563645600000, 1563649200000, 'AfRMemPPtjgbnXPg9'],
      [1563656400000, 1563660000000, 'htFHnnmKAD7zSsDbB'],
      [1563680700000, 1563687000000, 'meo2ZESqTXEnZ5pNP'],
      [1563715800000, 1563732000000, 'hbaRfNLrtr2pCSsDE'],
      [1563721200000, 1563722100000, 'QHfxQxP8BKpd9qywf'],
      [1563735600000, 1563742800000, '3ezrjc7yvT2M2Kp5m'],
      [1563767100000, 1563773400000, 'FfYmjW79HZk6CgDLT'],
      [1563769800000, 1563771600000, 'y9aTfEQ3Ar99czkqY'],
      [1563802200000, 1563817200000, 'F6gFijr7nkRXjiSQ2'],
      [1563807600000, 1563808500000, 'GoQyaMQxy5uAMkicC'],
      [1563814800000, 1563822000000, 'Rrzck9MrM4ScLkJBx'],
      [1563827400000, 1563831000000, 'NdYgZdgfttitwFDz3'],
    ]) {
      tree.addInterval(start as number, end as number, data)
    }
    tree.addInterval(1563843600000, 1563850800000, 'WQSMXKZEKsrp2Dads')
  })

  it('search', () => {
    tree.addInterval(1, 5)
    tree.addInterval(4, 6)
    tree.addInterval(5, 9)
    const result = tree.search(5, 6)
    expect(result.toArray().toString()).toEqual('Interval(4, 6),Interval(5, 9)')
  })
})
